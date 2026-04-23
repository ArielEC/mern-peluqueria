import { useCallback, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxon3Plugin from '@fullcalendar/luxon3';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useAdminAppointmentsRange } from '@/hooks/useAdminAppointments';
import { useSettings } from '@/hooks/useSettings';
import NewAppointmentModal from '@/components/admin/NewAppointmentModal';
import AppointmentDetailModal from '@/components/admin/AppointmentDetailModal';
import { formatFullDateInTz, formatInBusinessTz } from '@/lib/utils';

function buildResources(professionals) {
  return professionals.map((professional) => ({
    id: professional._id,
    title: professional.nombre,
    especialidad: professional.especialidad || '',
    resourceColor: professional.color || '#6b38d4',
  }));
}

function buildEvents(appointments) {
  return appointments
    .filter((appointment) => appointment.estado !== 'cancelada')
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

function buildHeaderLabel(isWeekView, currentDate, calendarRange, businessTimezone) {
  if (isWeekView) {
    const startLabel = formatInBusinessTz(calendarRange.desde || currentDate, businessTimezone, {
      day: 'numeric',
      month: 'short',
    });
    const endLabel = formatInBusinessTz(calendarRange.hasta || currentDate, businessTimezone, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `${startLabel} - ${endLabel}`;
  }

  return formatFullDateInTz(currentDate, businessTimezone);
}

function ResourceHeader({ resource }) {
  const initials = resource.title
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div
        className="h-8 w-8 shrink-0 rounded-xl text-xs font-bold text-white flex items-center justify-center"
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

export default function AdminCalendarPage() {
  const calendarRef = useRef(null);
  const [view, setView] = useState('resourceTimeGridDay');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarRange, setCalendarRange] = useState({ desde: '', hasta: '' });
  const [newModal, setNewModal] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);

  const { data: settings } = useSettings();
  const businessTimezone = settings?.zonaHoraria || 'Europe/Madrid';
  const isWeekView = view === 'resourceTimeGridWeek';

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals();
  const { data: appointments = [], isLoading: loadingAppts } = useAdminAppointmentsRange(
    calendarRange.desde,
    calendarRange.hasta
  );

  const resources = buildResources(professionals);
  const events = buildEvents(appointments);
  const headerLabel = buildHeaderLabel(isWeekView, currentDate, calendarRange, businessTimezone);

  function goTo(direction) {
    const calendar = calendarRef.current?.getApi();
    if (!calendar) return;

    if (direction === 'prev') {
      calendar.prev();
      return;
    }

    calendar.next();
  }

  function goToday() {
    const calendar = calendarRef.current?.getApi();
    if (!calendar) return;
    calendar.today();
  }

  function switchView(nextView) {
    const calendar = calendarRef.current?.getApi();
    if (!calendar) return;

    setView(nextView);
    calendar.changeView(nextView);
  }

  const handleDateClick = useCallback((info) => {
    setNewModal({
      date: info.dateStr,
      profesionalId: info.resource?.id || '',
    });
  }, []);

  const handleEventClick = useCallback((info) => {
    const appointment = info.event.extendedProps?.appointment;
    if (appointment) setDetailAppt(appointment);
  }, []);

  const handleDatesSet = useCallback((info) => {
    const visibleEnd = new Date(info.end.getTime() - 1);

    setCurrentDate((previousDate) => (
      previousDate.getTime() === info.view.currentStart.getTime() ? previousDate : info.view.currentStart
    ));
    setCalendarRange((previousRange) => {
      const nextRange = {
        desde: info.start.toISOString(),
        hasta: visibleEnd.toISOString(),
      };

      if (
        previousRange.desde === nextRange.desde &&
        previousRange.hasta === nextRange.hasta
      ) {
        return previousRange;
      }

      return nextRange;
    });
  }, []);

  const isLoading = loadingProfs || loadingAppts;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-4">
          <h2 className="truncate text-base font-bold capitalize text-[#131b2e] md:text-xl">{headerLabel}</h2>
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

        <div className="flex items-center gap-3">
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
              onClick={() => switchView('resourceTimeGridWeek')}
              className={`rounded-md px-4 py-1.5 text-[0.8rem] font-bold transition-all ${
                view === 'resourceTimeGridWeek'
                  ? 'bg-white text-[#6b38d4] shadow-sm'
                  : 'text-[#494454] hover:text-[#131b2e]'
              }`}
            >
              Semana
            </button>
          </div>

          <button
            onClick={() => setNewModal({ date: new Date().toISOString(), profesionalId: '' })}
            className="flex items-center gap-2 rounded-lg bg-[#6b38d4] px-4 py-2 text-[0.875rem] font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva Cita
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-[#cbc3d7]/20 bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#6b38d4]">refresh</span>
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimeGridPlugin, interactionPlugin, luxon3Plugin]}
          initialView={view}
          timeZone={businessTimezone}
          resources={resources}
          events={events}
          datesSet={handleDatesSet}
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
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
          resourceLabelContent={(arg) => <ResourceHeader resource={arg.resource} />}
          eventClassNames="cursor-pointer"
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

      {professionals.length > 0 && (
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
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
        />
      )}
    </div>
  );
}
