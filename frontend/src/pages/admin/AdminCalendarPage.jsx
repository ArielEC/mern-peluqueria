import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import luxon3Plugin from '@fullcalendar/luxon3';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { DateTime } from 'luxon';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useAdminAppointmentsRange } from '@/hooks/useAdminAppointments';
import { useAdminBlockers } from '@/hooks/useAdminEntities';
import { useSettings } from '@/hooks/useSettings';
import NewAppointmentModal from '@/components/admin/NewAppointmentModal';
import AppointmentDetailModal from '@/components/admin/AppointmentDetailModal';
import { formatFullDateInTz, formatInBusinessTz, formatTimeInTz } from '@/lib/utils';
import { scrollViewportToTop } from '@/lib/scroll';

function buildResources(professionals) {
  return professionals.map((professional) => ({
    id: professional._id,
    title: professional.nombre,
    especialidad: professional.especialidad || '',
    resourceColor: professional.color || '#6b38d4',
  }));
}

function isVisibleCalendarAppointment(appointment) {
  return appointment?.estado !== 'cancelada';
}

function timeStringToMinutes(time = '') {
  const [hours, minutes] = time.split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

function minutesToCalendarTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function roundDownToStep(totalMinutes, stepMinutes) {
  return Math.floor(totalMinutes / stepMinutes) * stepMinutes;
}

function roundUpToStep(totalMinutes, stepMinutes) {
  return Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
}

function getScheduleDayKey(date, businessTimezone) {
  return String(DateTime.fromJSDate(date, { zone: businessTimezone }).weekday % 7);
}

function getProfessionalWorkingWindow(professional, date, businessTimezone) {
  const dayKey = getScheduleDayKey(date, businessTimezone);
  const schedule = professional?.horarioSemanal?.[dayKey];

  if (!schedule?.activo) {
    return null;
  }

  const startMinutes = timeStringToMinutes(schedule.inicio);
  const endMinutes = timeStringToMinutes(schedule.fin);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  const breakStartMinutes = timeStringToMinutes(schedule.descansoInicio);
  const breakEndMinutes = timeStringToMinutes(schedule.descansoFin);

  return {
    startMinutes,
    endMinutes,
    breakStartMinutes,
    breakEndMinutes,
  };
}

function createDateAtMinutes(date, totalMinutes, businessTimezone) {
  return DateTime.fromJSDate(date, { zone: businessTimezone })
    .startOf('day')
    .plus({ minutes: totalMinutes })
    .toJSDate();
}

function getCalendarTimeBounds({
  professionals,
  appointments,
  visibleDates,
  businessTimezone,
  slotDurationMinutes,
}) {
  const fallbackMinMinutes = 8 * 60;
  const fallbackMaxMinutes = 20 * 60;
  const safeSlotDurationMinutes = Math.max(5, Number(slotDurationMinutes) || 15);
  const scheduleStartCandidates = [];
  const scheduleEndCandidates = [];
  const appointmentStartCandidates = [];
  const appointmentEndCandidates = [];

  professionals.forEach((professional) => {
    visibleDates.forEach((date) => {
      const window = getProfessionalWorkingWindow(professional, date, businessTimezone);

      if (!window) return;

      scheduleStartCandidates.push(window.startMinutes);
      scheduleEndCandidates.push(window.endMinutes);
    });
  });

  appointments.forEach((appointment) => {
    const appointmentStart = timeStringToMinutes(formatTimeInTz(appointment.fechaHoraInicio, businessTimezone));
    const appointmentEnd = timeStringToMinutes(
      formatTimeInTz(
        appointment.fechaHoraFinOperativa || appointment.fechaHoraFin || appointment.fechaHoraInicio,
        businessTimezone
      )
    );

    if (appointmentStart !== null) {
      appointmentStartCandidates.push(appointmentStart);
    }

    if (appointmentEnd !== null) {
      appointmentEndCandidates.push(appointmentEnd);
    }
  });

  let minMinutes = scheduleStartCandidates.length > 0
    ? roundDownToStep(Math.min(...scheduleStartCandidates), safeSlotDurationMinutes)
    : fallbackMinMinutes;
  let maxMinutes = scheduleEndCandidates.length > 0
    ? roundUpToStep(Math.max(...scheduleEndCandidates), safeSlotDurationMinutes)
    : fallbackMaxMinutes;

  if (appointmentStartCandidates.length > 0) {
    minMinutes = Math.min(
      minMinutes,
      roundDownToStep(Math.min(...appointmentStartCandidates), safeSlotDurationMinutes)
    );
  }

  if (appointmentEndCandidates.length > 0) {
    maxMinutes = Math.max(
      maxMinutes,
      roundUpToStep(Math.max(...appointmentEndCandidates), safeSlotDurationMinutes)
    );
  }

  minMinutes = Math.max(0, minMinutes);
  maxMinutes = Math.min(24 * 60, maxMinutes);
  const slotMaxMinutes = Math.min(
    24 * 60,
    Math.max(maxMinutes + 60, minMinutes + 60)
  );

  return {
    minMinutes,
    maxMinutes: slotMaxMinutes,
    slotMinTime: minutesToCalendarTime(minMinutes),
    slotMaxTime: minutesToCalendarTime(slotMaxMinutes),
  };
}

function buildUnavailableBackgroundEvents({
  professionals,
  visibleDates,
  businessTimezone,
  minMinutes,
  maxMinutes,
  useResources,
}) {
  const events = [];

  professionals.forEach((professional) => {
    visibleDates.forEach((date) => {
      const window = getProfessionalWorkingWindow(professional, date, businessTimezone);
      const sharedProps = {
        display: 'background',
        interactive: false,
        overlap: false,
        classNames: ['admin-calendar-unavailable'],
        ...(useResources ? { resourceId: professional._id } : {}),
      };

      if (!window) {
        events.push({
          ...sharedProps,
          id: `off-${professional._id}-${date.toISOString()}`,
          start: createDateAtMinutes(date, minMinutes, businessTimezone),
          end: createDateAtMinutes(date, maxMinutes, businessTimezone),
        });
        return;
      }

      if (window.startMinutes > minMinutes) {
        events.push({
          ...sharedProps,
          id: `before-${professional._id}-${date.toISOString()}`,
          start: createDateAtMinutes(date, minMinutes, businessTimezone),
          end: createDateAtMinutes(date, window.startMinutes, businessTimezone),
        });
      }

      if (
        window.breakStartMinutes !== null
        && window.breakEndMinutes !== null
        && window.breakEndMinutes > window.breakStartMinutes
      ) {
        events.push({
          ...sharedProps,
          id: `break-${professional._id}-${date.toISOString()}`,
          start: createDateAtMinutes(date, window.breakStartMinutes, businessTimezone),
          end: createDateAtMinutes(date, window.breakEndMinutes, businessTimezone),
        });
      }

      if (window.endMinutes < maxMinutes) {
        events.push({
          ...sharedProps,
          id: `after-${professional._id}-${date.toISOString()}`,
          start: createDateAtMinutes(date, window.endMinutes, businessTimezone),
          end: createDateAtMinutes(date, maxMinutes, businessTimezone),
        });
      }
    });
  });

  return events;
}

function getBlockerProfessionalId(blocker) {
  if (!blocker?.profesional) return null;
  return typeof blocker.profesional === 'object' ? blocker.profesional._id : blocker.profesional;
}

function blockerAffectsProfessional(blocker, professionalId) {
  const blockerProfessionalId = getBlockerProfessionalId(blocker);
  return blockerProfessionalId === null || blockerProfessionalId === professionalId;
}

function buildBlockerBackgroundEvents({
  blockers,
  professionals,
  selectedProfessionalId,
  useResources,
}) {
  const events = [];

  blockers.forEach((blocker) => {
    const blockerProfessionalId = getBlockerProfessionalId(blocker);
    const baseEvent = {
      display: 'background',
      interactive: false,
      overlap: false,
      classNames: ['admin-calendar-unavailable', 'admin-calendar-blocker'],
      start: blocker.fechaHoraInicio,
      end: blocker.fechaHoraFin,
    };

    if (useResources) {
      if (blockerProfessionalId) {
        events.push({
          ...baseEvent,
          id: `blocker-${blocker._id}-${blockerProfessionalId}`,
          resourceId: blockerProfessionalId,
        });
        return;
      }

      professionals.forEach((professional) => {
        events.push({
          ...baseEvent,
          id: `blocker-${blocker._id}-${professional._id}`,
          resourceId: professional._id,
        });
      });
        return;
    }

    if (!selectedProfessionalId || blockerAffectsProfessional(blocker, selectedProfessionalId)) {
      events.push({
        ...baseEvent,
        id: `blocker-${blocker._id}-${selectedProfessionalId || 'all'}`,
      });
    }
  });

  return events;
}

function isSlotBlockedByBlockers({
  date,
  professionalId,
  blockers,
  slotDurationMinutes,
}) {
  if (!professionalId || blockers.length === 0) {
    return false;
  }

  const slotEnd = new Date(date.getTime() + slotDurationMinutes * 60000);

  return blockers.some((blocker) => {
    if (!blockerAffectsProfessional(blocker, professionalId)) {
      return false;
    }

    const blockerStart = new Date(blocker.fechaHoraInicio);
    const blockerEnd = new Date(blocker.fechaHoraFin);

    return date < blockerEnd && slotEnd > blockerStart;
  });
}

function isSlotSelectable({
  date,
  professional,
  businessTimezone,
}) {
  const window = getProfessionalWorkingWindow(professional, date, businessTimezone);

  if (!window) {
    return false;
  }

  const slotMinutes = (DateTime.fromJSDate(date, { zone: businessTimezone }).hour * 60)
    + DateTime.fromJSDate(date, { zone: businessTimezone }).minute;

  if (slotMinutes < window.startMinutes || slotMinutes >= window.endMinutes) {
    return false;
  }

  if (
    window.breakStartMinutes !== null
    && window.breakEndMinutes !== null
    && slotMinutes >= window.breakStartMinutes
    && slotMinutes < window.breakEndMinutes
  ) {
    return false;
  }

  return true;
}

function buildEvents(appointments) {
  return appointments
    .filter(isVisibleCalendarAppointment)
    .map((appointment) => {
      const professionalColor = appointment.profesional?.color || '#6b38d4';

      return {
        id: appointment._id,
        resourceId: appointment.profesional?._id,
        title: [
          appointment.cliente?.nombre || appointment.nombreTercero || 'Cliente',
          appointment.servicio?.nombre,
        ].filter(Boolean).join(' · '),
        start: appointment.fechaHoraInicio,
        end: appointment.fechaHoraFinOperativa || appointment.fechaHoraFin || appointment.fechaHoraInicio,
        backgroundColor: `${professionalColor}22`,
        borderColor: professionalColor,
        textColor: '#131b2e',
        extendedProps: { appointment },
      };
    });
}

function getViewRange(currentDate, isWeekView, businessTimezone) {
  const anchor = DateTime.fromJSDate(currentDate, { zone: businessTimezone });
  const start = isWeekView ? anchor.startOf('week') : anchor.startOf('day');
  const end = isWeekView ? anchor.endOf('week') : anchor.endOf('day');
  const days = isWeekView
    ? Array.from({ length: 7 }, (_, index) => start.plus({ days: index }).toJSDate())
    : [];

  return {
    desde: start.toUTC().toISO(),
    hasta: end.toUTC().toISO(),
    startDate: start.toJSDate(),
    endDate: end.toJSDate(),
    days,
  };
}

function buildHeaderLabel(isWeekView, range, currentDate, businessTimezone) {
  if (isWeekView) {
    const startLabel = formatInBusinessTz(range.startDate, businessTimezone, {
      day: 'numeric',
      month: 'short',
    });
    const endLabel = formatInBusinessTz(range.endDate, businessTimezone, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `${startLabel} - ${endLabel}`;
  }

  return formatFullDateInTz(currentDate, businessTimezone);
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function capitalizeText(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMobileAgendaDayLabels(date, businessTimezone) {
  return {
    weekdayLabel: capitalizeText(
      formatInBusinessTz(date, businessTimezone, { weekday: 'long' }).replace('.', '')
    ),
    dateLabel: formatInBusinessTz(date, businessTimezone, {
      day: 'numeric',
      month: 'short',
    }),
  };
}

function getDayKey(date, businessTimezone) {
  return formatInBusinessTz(date, businessTimezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function useIsMobileBreakpoint(maxWidth = 767) {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(query).matches
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setIsMobile(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return isMobile;
}

function ResourceHeader({ resource }) {
  const initials = getInitials(resource.title);

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
        style={{ backgroundColor: resource.extendedProps?.resourceColor || '#6b38d4' }}
      >
        {initials}
      </div>
      <div className="overflow-hidden text-left">
        <p className="truncate text-[0.8rem] font-bold leading-tight text-[#131b2e]">{resource.title}</p>
        {resource.extendedProps?.especialidad && (
          <p className="truncate text-[0.65rem] font-bold uppercase leading-tight text-[#6b38d4]">
            {resource.extendedProps.especialidad}
          </p>
        )}
      </div>
    </div>
  );
}

function LegendChip({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-[#494454]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DayHeaderContent({ date, businessTimezone }) {
  const weekdayLabel = capitalizeText(
    formatInBusinessTz(date, businessTimezone, { weekday: 'long' }).replace('.', '')
  );
  const dateLabel = formatInBusinessTz(date, businessTimezone, {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      <span className="text-[0.72rem] font-bold uppercase text-[#494454]">{weekdayLabel}</span>
      <span className="text-[0.88rem] font-bold text-[#131b2e]">{dateLabel}</span>
    </div>
  );
}

function MobileAgendaDayHeader({ date, businessTimezone, appointmentCount }) {
  const { weekdayLabel, dateLabel } = getMobileAgendaDayLabels(date, businessTimezone);

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#6b38d4]">{weekdayLabel}</p>
        <p className="truncate text-[1rem] font-bold text-[#131b2e]">{dateLabel}</p>
      </div>
      <span className="rounded-full bg-[#f2f3ff] px-2.5 py-1 text-[0.72rem] font-bold text-[#494454]">
        {appointmentCount} cita{appointmentCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function AppointmentEventContent({ timeText, appointment, spacious = false }) {
  const clientName = appointment?.cliente?.nombre || appointment?.nombreTercero || 'Cliente';
  const serviceName = appointment?.servicio?.nombre || '';

  return (
    <div className={`flex h-full min-h-0 flex-col ${spacious ? 'gap-1.5 p-2' : 'gap-0.5 p-1.5'}`}>
      {timeText && (
        <span className={`font-black leading-none text-[#131b2e] ${spacious ? 'text-[0.76rem]' : 'text-[0.66rem]'}`}>
          {timeText}
        </span>
      )}
      <span className={`truncate font-bold leading-tight text-[#131b2e] ${spacious ? 'text-[0.86rem]' : 'text-[0.7rem]'}`}>
        {clientName}
      </span>
      {serviceName && (
        <span className={`truncate leading-tight text-[#494454] ${spacious ? 'text-[0.76rem]' : 'text-[0.64rem]'}`}>
          {serviceName}
        </span>
      )}
    </div>
  );
}

function DesktopWeekProfessionalPicker({ resources, selectedResourceId, onSelect }) {
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) || resources[0];

  return (
    <div className="hidden min-w-[16rem] items-center gap-3 rounded-xl border border-[#cbc3d7]/25 bg-white px-3 py-2 shadow-[0_10px_30px_-22px_rgba(19,27,46,0.35)] md:flex">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
        style={{ backgroundColor: selectedResource?.resourceColor || '#6b38d4' }}
      >
        {getInitials(selectedResource?.title || '')}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#6b38d4]">Profesional</p>
        <div className="relative mt-0.5">
          <select
            value={selectedResourceId}
            onChange={(event) => onSelect(event.target.value)}
            aria-label="Seleccionar profesional"
            className="w-full appearance-none bg-transparent pr-8 text-[0.85rem] font-bold text-[#131b2e] outline-none"
          >
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.title}
              </option>
            ))}
          </select>
          <span className="pointer-events-none material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[18px] text-[#6b38d4]">
            expand_more
          </span>
        </div>
        {selectedResource?.especialidad && (
          <p className="truncate text-[0.68rem] font-bold uppercase text-[#81768f]">
            {selectedResource.especialidad}
          </p>
        )}
      </div>
    </div>
  );
}

function MobileProfessionalPicker({ resources, selectedResourceId, onSelect }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const selectedButton = scrollRef.current?.querySelector(`[data-resource-id="${selectedResourceId}"]`);
    selectedButton?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedResourceId]);

  function scrollList(direction) {
    scrollRef.current?.scrollBy({
      left: direction * 180,
      behavior: 'smooth',
    });
  }

  return (
    <div className="rounded-2xl border border-[#cbc3d7]/30 bg-[#f8f7ff] p-2.5 md:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollList(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cbc3d7]/30 bg-white text-[#494454] shadow-sm transition-colors hover:bg-[#f2f3ff]"
          aria-label="Desplazar profesionales a la izquierda"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto rounded-xl border border-white/70 bg-white p-1 shadow-sm"
        >
          {resources.map((resource) => {
            const isSelected = resource.id === selectedResourceId;

            return (
              <button
                key={resource.id}
                type="button"
                data-resource-id={resource.id}
                onClick={() => onSelect(resource.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-all ${
                  isSelected
                    ? 'border-[#6b38d4] bg-[#ede5ff] text-[#6b38d4]'
                    : 'border-[#cbc3d7]/30 bg-white text-[#494454]'
                }`}
              >
                <span
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[0.64rem] font-bold text-white"
                  style={{ backgroundColor: resource.resourceColor || '#6b38d4' }}
                >
                  {getInitials(resource.title)}
                </span>
                <span className="max-w-[6.5rem] truncate text-[0.74rem] font-bold">{resource.title}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollList(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cbc3d7]/30 bg-white text-[#494454] shadow-sm transition-colors hover:bg-[#f2f3ff]"
          aria-label="Desplazar profesionales a la derecha"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

function MobileAgendaAppointmentCard({ appointment, businessTimezone, onAppointmentClick }) {
  const start = appointment.fechaHoraInicio;
  const end = appointment.fechaHoraFinOperativa || appointment.fechaHoraFin || appointment.fechaHoraInicio;
  const clientName = appointment.cliente?.nombre || appointment.nombreTercero || 'Cliente';
  const serviceName = appointment.servicio?.nombre || 'Servicio';
  const professionalColor = appointment.profesional?.color || '#6b38d4';

  return (
    <button
      type="button"
      onClick={() => onAppointmentClick(appointment)}
      className="flex w-full items-start gap-3 rounded-2xl border border-[#cbc3d7]/25 bg-[#faf9ff] px-3 py-3 text-left transition-colors hover:bg-[#f2f3ff]"
    >
      <span
        className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: professionalColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8rem] font-black text-[#131b2e]">
          {formatTimeInTz(start, businessTimezone)} - {formatTimeInTz(end, businessTimezone)}
        </p>
        <p className="mt-1 truncate text-[0.92rem] font-bold text-[#131b2e]">{clientName}</p>
        <p className="truncate text-[0.8rem] text-[#494454]">{serviceName}</p>
      </div>
      <span className="material-symbols-outlined text-[18px] text-[#6b38d4]">chevron_right</span>
    </button>
  );
}

function MobileAgendaEmptyState({ message = 'No hay citas para este dia.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbc3d7]/40 bg-[#faf9ff] px-4 py-5 text-center text-[0.85rem] text-[#494454]">
      {message}
    </div>
  );
}

function MobileDayAgenda({ date, appointments, businessTimezone, onAppointmentClick }) {
  const sortedAppointments = useMemo(
    () => appointments
      .slice()
      .sort((left, right) => new Date(left.fechaHoraInicio) - new Date(right.fechaHoraInicio)),
    [appointments]
  );

  return (
    <div className="flex flex-col gap-3 md:hidden">
      <section className="rounded-2xl border border-[#cbc3d7]/30 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(19,27,46,0.15)]">
        <MobileAgendaDayHeader
          date={date}
          businessTimezone={businessTimezone}
          appointmentCount={sortedAppointments.length}
        />

        {sortedAppointments.length > 0 ? (
          <div className="space-y-2">
            {sortedAppointments.map((appointment) => (
              <MobileAgendaAppointmentCard
                key={appointment._id}
                appointment={appointment}
                businessTimezone={businessTimezone}
                onAppointmentClick={onAppointmentClick}
              />
            ))}
          </div>
        ) : (
          <MobileAgendaEmptyState />
        )}
      </section>
    </div>
  );
}

function MobileWeekAgenda({ days, appointments, businessTimezone, onAppointmentClick }) {
  const appointmentsByDay = useMemo(() => {
    const grouped = new Map();

    appointments
      .slice()
      .sort((left, right) => new Date(left.fechaHoraInicio) - new Date(right.fechaHoraInicio))
      .forEach((appointment) => {
        const key = getDayKey(appointment.fechaHoraInicio, businessTimezone);
        const current = grouped.get(key) || [];
        current.push(appointment);
        grouped.set(key, current);
      });

    return grouped;
  }, [appointments, businessTimezone]);

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {days.map((day) => {
        const dayKey = getDayKey(day, businessTimezone);
        const dayAppointments = appointmentsByDay.get(dayKey) || [];

        return (
          <section key={dayKey} className="rounded-2xl border border-[#cbc3d7]/30 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(19,27,46,0.15)]">
            <MobileAgendaDayHeader
              date={day}
              businessTimezone={businessTimezone}
              appointmentCount={dayAppointments.length}
            />

            {dayAppointments.length > 0 ? (
              <div className="space-y-2">
                {dayAppointments.map((appointment) => (
                  <MobileAgendaAppointmentCard
                    key={appointment._id}
                    appointment={appointment}
                    businessTimezone={businessTimezone}
                    onAppointmentClick={onAppointmentClick}
                  />
                ))}
              </div>
            ) : (
              <>
                <MobileAgendaEmptyState />
                {/*
                No hay citas para este día.
              </div>
                */}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function AdminCalendarPage() {
  const [view, setView] = useState('resourceTimeGridDay');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekProfessionalId, setWeekProfessionalId] = useState('');
  const [mobileProfessionalId, setMobileProfessionalId] = useState('');
  const [newModal, setNewModal] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);
  const calendarRef = useRef(null);
  const calendarContainerRef = useRef(null);
  const resizeFrameRef = useRef(null);

  const { data: settings } = useSettings();
  const businessTimezone = settings?.zonaHoraria || 'Europe/Madrid';
  const slotDurationMinutes = Number(settings?.duracionSlot) || 15;
  const slotDurationValue = `00:${String(slotDurationMinutes).padStart(2, '0')}:00`;
  const isMobile = useIsMobileBreakpoint();
  const isDayView = view === 'resourceTimeGridDay';
  const isWeekView = view === 'timeGridWeek';
  const isDesktopWeekView = !isMobile && isWeekView;
  const isMobileDayView = isMobile && isDayView;
  const isMobileWeekView = isMobile && isWeekView;

  const range = useMemo(
    () => getViewRange(currentDate, isWeekView, businessTimezone),
    [currentDate, isWeekView, businessTimezone]
  );

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals();
  const { data: appointments = [], isLoading: loadingAppts } = useAdminAppointmentsRange(
    range.desde,
    range.hasta
  );
  const { data: blockers = [], isLoading: loadingBlockers } = useAdminBlockers({
    desde: range.desde,
    hasta: range.hasta,
  });
  const professionalsById = useMemo(
    () => new Map(professionals.map((professional) => [professional._id, professional])),
    [professionals]
  );

  const resources = useMemo(() => buildResources(professionals), [professionals]);
  const activeWeekProfessionalId = isWeekView
    ? (
      resources.some((resource) => resource.id === weekProfessionalId)
        ? weekProfessionalId
        : resources[0]?.id || ''
    )
    : '';
  const activeMobileProfessionalId = isMobile
    ? (
      resources.some((resource) => resource.id === mobileProfessionalId)
        ? mobileProfessionalId
        : resources[0]?.id || ''
    )
    : '';
  const visibleAppointments = useMemo(() => {
    if (isMobileDayView || isMobileWeekView) {
      if (!activeMobileProfessionalId) return [];
      return appointments.filter(
        (appointment) => (
          appointment.profesional?._id === activeMobileProfessionalId
          && isVisibleCalendarAppointment(appointment)
        )
      );
    }

    if (isWeekView) {
      if (!activeWeekProfessionalId) return [];
      return appointments.filter(
        (appointment) => (
          appointment.profesional?._id === activeWeekProfessionalId
          && isVisibleCalendarAppointment(appointment)
        )
      );
    }

    return appointments.filter(isVisibleCalendarAppointment);
  }, [
    appointments,
    isMobileDayView,
    isMobileWeekView,
    activeMobileProfessionalId,
    isWeekView,
    activeWeekProfessionalId,
  ]);
  const calendarVisibleDates = useMemo(
    () => (isWeekView ? range.days : [range.startDate]),
    [isWeekView, range.days, range.startDate]
  );
  const visibleCalendarProfessionals = useMemo(() => {
    if (isMobileDayView || isMobileWeekView) {
      return [];
    }

    if (isWeekView) {
      const professional = professionalsById.get(activeWeekProfessionalId);
      return professional ? [professional] : [];
    }

    return professionals;
  }, [
    activeWeekProfessionalId,
    isMobileDayView,
    isMobileWeekView,
    isWeekView,
    professionals,
    professionalsById,
  ]);
  const visibleCalendarProfessionalIds = useMemo(
    () => visibleCalendarProfessionals.map((professional) => professional._id),
    [visibleCalendarProfessionals]
  );
  const visibleCalendarBlockers = useMemo(() => {
    if (isMobileDayView || isMobileWeekView) {
      return [];
    }

    if (isWeekView) {
      if (!activeWeekProfessionalId) return [];
      return blockers.filter((blocker) => blockerAffectsProfessional(blocker, activeWeekProfessionalId));
    }

    return blockers.filter((blocker) => {
      const blockerProfessionalId = getBlockerProfessionalId(blocker);
      return blockerProfessionalId === null || visibleCalendarProfessionalIds.includes(blockerProfessionalId);
    });
  }, [
    activeWeekProfessionalId,
    blockers,
    isMobileDayView,
    isMobileWeekView,
    isWeekView,
    visibleCalendarProfessionalIds,
  ]);
  const calendarTimeBounds = useMemo(
    () => getCalendarTimeBounds({
      professionals: visibleCalendarProfessionals,
      appointments: visibleAppointments,
      visibleDates: calendarVisibleDates,
      businessTimezone,
      slotDurationMinutes,
    }),
    [
      visibleCalendarProfessionals,
      visibleAppointments,
      calendarVisibleDates,
      businessTimezone,
      slotDurationMinutes,
    ]
  );
  const appointmentEvents = useMemo(() => buildEvents(visibleAppointments), [visibleAppointments]);
  const unavailableBackgroundEvents = useMemo(
    () => buildUnavailableBackgroundEvents({
      professionals: visibleCalendarProfessionals,
      visibleDates: calendarVisibleDates,
      businessTimezone,
      minMinutes: calendarTimeBounds.minMinutes,
      maxMinutes: calendarTimeBounds.maxMinutes,
      useResources: isDayView && !isMobileDayView,
    }),
    [
      visibleCalendarProfessionals,
      calendarVisibleDates,
      businessTimezone,
      calendarTimeBounds.minMinutes,
      calendarTimeBounds.maxMinutes,
      isDayView,
      isMobileDayView,
    ]
  );
  const blockerBackgroundEvents = useMemo(
    () => buildBlockerBackgroundEvents({
      blockers: visibleCalendarBlockers,
      professionals: visibleCalendarProfessionals,
      selectedProfessionalId: activeWeekProfessionalId,
      useResources: isDayView && !isMobileDayView,
    }),
    [
      activeWeekProfessionalId,
      isDayView,
      isMobileDayView,
      visibleCalendarBlockers,
      visibleCalendarProfessionals,
    ]
  );
  const events = useMemo(
    () => [...unavailableBackgroundEvents, ...blockerBackgroundEvents, ...appointmentEvents],
    [unavailableBackgroundEvents, blockerBackgroundEvents, appointmentEvents]
  );
  const headerLabel = isMobileDayView
    ? `${capitalizeText(formatInBusinessTz(currentDate, businessTimezone, { weekday: 'long' }).replace('.', ''))}, ${
      formatInBusinessTz(currentDate, businessTimezone, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }`
    : buildHeaderLabel(isWeekView, range, currentDate, businessTimezone);
  const showLegend = professionals.length > 0 && !isWeekView && !isMobileDayView;
  const calendarView = isMobileDayView ? 'timeGridDay' : view;
  const calendarRenderKey = [
    calendarView,
    currentDate.toISOString(),
    businessTimezone,
    slotDurationMinutes,
    calendarTimeBounds.slotMinTime,
    calendarTimeBounds.slotMaxTime,
    isDesktopWeekView ? activeWeekProfessionalId : 'all',
    isMobileDayView || isMobileWeekView ? activeMobileProfessionalId : 'all',
  ].join(':');

  function goTo(direction) {
    const anchor = DateTime.fromJSDate(currentDate, { zone: businessTimezone });
    const delta = isWeekView
      ? { weeks: direction === 'prev' ? -1 : 1 }
      : { days: direction === 'prev' ? -1 : 1 };

    scrollViewportToTop();
    setCurrentDate(anchor.plus(delta).toJSDate());
  }

  function goToday() {
    scrollViewportToTop();
    setCurrentDate(DateTime.now().setZone(businessTimezone).toJSDate());
  }

  function switchView(nextView) {
    scrollViewportToTop();
    setView(nextView);
  }

  const handleDateClick = useCallback((info) => {
    const selectedProfessionalId = isMobileDayView || isMobileWeekView
      ? activeMobileProfessionalId
      : isWeekView
        ? activeWeekProfessionalId
        : info.resource?.id || '';
    const selectedProfessional = professionalsById.get(selectedProfessionalId);

    if (selectedProfessional && !isSlotSelectable({
      date: info.date,
      professional: selectedProfessional,
      businessTimezone,
    })) {
      return;
    }

    if (isSlotBlockedByBlockers({
      date: info.date,
      professionalId: selectedProfessionalId,
      blockers: visibleCalendarBlockers,
      slotDurationMinutes,
    })) {
      return;
    }

    setNewModal({
      date: info.dateStr,
      profesionalId: selectedProfessionalId,
    });
  }, [
    activeMobileProfessionalId,
    activeWeekProfessionalId,
    businessTimezone,
    isMobileDayView,
    isMobileWeekView,
    isWeekView,
    professionalsById,
    slotDurationMinutes,
    visibleCalendarBlockers,
  ]);

  const handleEventClick = useCallback((info) => {
    const appointment = info.event.extendedProps?.appointment;
    if (appointment) setDetailAppt(appointment);
  }, []);
  const syncCalendarSize = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      calendarRef.current?.getApi?.()?.updateSize();
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (isMobileDayView || isMobileWeekView) {
      return undefined;
    }

    const container = calendarContainerRef.current;

    if (!container || typeof ResizeObserver === 'undefined') {
      syncCalendarSize();
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      syncCalendarSize();
    });

    observer.observe(container);
    syncCalendarSize();

    return () => {
      observer.disconnect();

      if (resizeFrameRef.current) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [isMobileDayView, isMobileWeekView, syncCalendarSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isMobileDayView || isMobileWeekView) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const api = calendarRef.current?.getApi?.();

      if (!api?.scrollToTime) {
        return;
      }

      api.scrollToTime(calendarTimeBounds.slotMinTime);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activeWeekProfessionalId,
    calendarTimeBounds.slotMinTime,
    isMobileDayView,
    isMobileWeekView,
    view,
  ]);

  const isLoading = loadingProfs || loadingAppts || loadingBlockers;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-4">
          <h2 className={`truncate font-bold capitalize text-[#131b2e] ${isMobileDayView ? 'text-[0.95rem] leading-tight' : 'text-base md:text-xl'}`}>
            {headerLabel}
          </h2>
          <div className="flex items-center gap-0.5 rounded-lg bg-[#f2f3ff] p-1">
            <button
              onClick={() => goTo('prev')}
              className="rounded-md px-2 py-1.5 text-[#494454] transition-colors hover:bg-white"
              aria-label="Anterior"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={goToday}
              className="rounded-md px-3 py-1.5 text-[0.75rem] font-bold text-[#6b38d4] transition-colors hover:bg-white"
            >
              Hoy
            </button>
            <button
              onClick={() => goTo('next')}
              className="rounded-md px-2 py-1.5 text-[#494454] transition-colors hover:bg-white"
              aria-label="Siguiente"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:flex-nowrap">
          <div className="flex rounded-lg bg-[#f2f3ff] p-1">
            <button
              onClick={() => switchView('resourceTimeGridDay')}
              className={`rounded-md px-4 py-1.5 text-[0.8rem] font-bold transition-all ${
                view === 'resourceTimeGridDay'
                  ? 'bg-white text-[#6b38d4] shadow-sm'
                  : 'text-[#494454] hover:text-[#131b2e]'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => switchView('timeGridWeek')}
              className={`rounded-md px-4 py-1.5 text-[0.8rem] font-bold transition-all ${
                view === 'timeGridWeek'
                  ? 'bg-white text-[#6b38d4] shadow-sm'
                  : 'text-[#494454] hover:text-[#131b2e]'
              }`}
            >
              Semana
            </button>
          </div>

          {isDesktopWeekView && resources.length > 0 && (
            <DesktopWeekProfessionalPicker
              resources={resources}
              selectedResourceId={activeWeekProfessionalId}
              onSelect={setWeekProfessionalId}
            />
          )}

          <button
            onClick={() => setNewModal({ date: new Date().toISOString(), profesionalId: '' })}
            className="flex items-center gap-2 rounded-lg bg-[#6b38d4] px-4 py-2 text-[0.875rem] font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva Cita
          </button>
        </div>
      </div>

      {(isMobileDayView || isMobileWeekView) && resources.length > 0 && (
        <MobileProfessionalPicker
          resources={resources}
          selectedResourceId={activeMobileProfessionalId}
          onSelect={setMobileProfessionalId}
        />
      )}

      {isMobileDayView ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <MobileDayAgenda
            date={currentDate}
            appointments={visibleAppointments}
            businessTimezone={businessTimezone}
            onAppointmentClick={setDetailAppt}
          />
        </div>
      ) : isMobileWeekView ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <MobileWeekAgenda
            days={range.days}
            appointments={visibleAppointments}
            businessTimezone={businessTimezone}
            onAppointmentClick={setDetailAppt}
          />
        </div>
      ) : (
        <div ref={calendarContainerRef} className={`relative min-h-0 flex-1 overflow-auto rounded-xl border border-[#cbc3d7]/20 bg-white ${
          isDesktopWeekView ? 'admin-calendar-desktop-week' : ''
        } ${
          isMobileDayView ? 'admin-calendar-mobile-day' : ''
        }`}>
          {isLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#6b38d4]">refresh</span>
            </div>
          )}

          <FullCalendar
            ref={calendarRef}
            key={calendarRenderKey}
            plugins={[resourceTimeGridPlugin, timeGridPlugin, interactionPlugin, luxon3Plugin]}
            initialView={calendarView}
            initialDate={currentDate}
            timeZone={businessTimezone}
            resources={isDayView && !isMobileDayView ? resources : []}
            events={events}
            slotDuration={slotDurationValue}
            slotLabelInterval="01:00:00"
            slotMinTime={calendarTimeBounds.slotMinTime}
            slotMaxTime={calendarTimeBounds.slotMaxTime}
            scrollTime={calendarTimeBounds.slotMinTime}
            scrollTimeReset
            locale="es"
            firstDay={1}
            allDaySlot={false}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            selectable={false}
            nowIndicator
            schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
            headerToolbar={false}
            height="100%"
            eventMinHeight={isMobileDayView ? 64 : isDesktopWeekView ? 76 : undefined}
            eventShortHeight={isMobileDayView ? 64 : isDesktopWeekView ? 76 : undefined}
            resourceAreaWidth={180}
            resourceLabelContent={(arg) => <ResourceHeader resource={arg.resource} />}
            dayHeaderContent={(arg) => (
              <DayHeaderContent
                date={arg.date}
                businessTimezone={businessTimezone}
              />
            )}
            eventContent={(arg) => {
              if (arg.event.display === 'background') {
                return null;
              }

              return (
                <AppointmentEventContent
                  timeText={arg.timeText}
                  appointment={arg.event.extendedProps?.appointment}
                  spacious={isWeekView}
                />
              );
            }}
            eventDidMount={(arg) => {
              const harness = arg.el.parentElement;

              if (arg.event.display === 'background') {
                arg.el.style.pointerEvents = 'none';

                if (harness) {
                  harness.style.pointerEvents = 'none';
                }

                return;
              }

              arg.el.style.pointerEvents = 'auto';

              if (harness) {
                harness.style.pointerEvents = 'auto';
                harness.style.zIndex = '10';
              }
            }}
            eventClassNames={(arg) => {
              if (arg.event.display === 'background') {
                return ['admin-calendar-unavailable'];
              }

              if (isWeekView) {
                return ['cursor-pointer', 'admin-calendar-week-event'];
              }

              if (isMobileDayView) {
                return ['cursor-pointer', 'admin-calendar-mobile-day-event'];
              }

              return ['cursor-pointer'];
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        </div>
      )}

      {showLegend && (
        <div className="flex shrink-0 flex-wrap items-center gap-4 px-1">
          {professionals.map((professional) => (
            <LegendChip
              key={professional._id}
              color={professional.color || '#6b38d4'}
              label={professional.nombre}
            />
          ))}
        </div>
      )}

      {newModal && (
        <NewAppointmentModal
          key={`${businessTimezone}-${newModal.date}-${newModal.profesionalId || 'auto'}`}
          initialDate={newModal.date}
          initialProfesionalId={newModal.profesionalId}
          onClose={() => setNewModal(null)}
          onSuccess={() => setNewModal(null)}
        />
      )}

      {detailAppt && (
        <AppointmentDetailModal
          key={`${detailAppt._id}-${detailAppt.estado}-${detailAppt.updatedAt || detailAppt.fechaHoraInicio}`}
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
        />
      )}
    </div>
  );
}
