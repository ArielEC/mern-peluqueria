import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useAdminAppointmentsRange } from '@/hooks/useAdminAppointments';
import NewAppointmentModal from '@/components/admin/NewAppointmentModal';
import AppointmentDetailModal from '@/components/admin/AppointmentDetailModal';

/* ── helpers ── */
function isoDay(date) {
  return format(date, 'yyyy-MM-dd');
}

function buildResources(professionals) {
  return professionals.map((p) => ({
    id: p._id,
    title: p.nombre,
    especialidad: p.especialidad || '',
    color: p.color || '#6b38d4',
  }));
}

function buildEvents(appointments) {
  return appointments.map((appt) => {
    const profColor = appt.profesional?.color || '#6b38d4';
    return {
      id: appt._id,
      resourceId: appt.profesional?._id,
      title: appt.cliente?.nombre || appt.nombreTercero || 'Cliente',
      start: appt.fechaHoraInicio,
      end: appt.fechaHoraFin || appt.fechaHoraInicio,
      backgroundColor: profColor + '20',
      borderColor: profColor,
      textColor: '#131b2e',
      extendedProps: { appointment: appt },
    };
  });
}

/* ── Custom resource header (columna por profesional) ── */
function ResourceHeader({ resource }) {
  const initials = resource.title
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: resource.extendedProps?.color || '#6b38d4' }}
      >
        {initials}
      </div>
      <div className="text-left overflow-hidden">
        <p className="text-[0.8rem] font-bold text-[#131b2e] truncate leading-tight">{resource.title}</p>
        {resource.extendedProps?.especialidad && (
          <p className="text-[0.65rem] text-[#6b38d4] uppercase font-bold truncate leading-tight">
            {resource.extendedProps.especialidad}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Legend chip ── */
function LegendChip({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-[#494454]">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/* ── Page ── */
export default function AdminCalendarPage() {
  const calendarRef = useRef(null);
  const [view, setView] = useState('resourceTimeGridDay');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newModal, setNewModal] = useState(null); // { date, profesionalId? }
  const [detailAppt, setDetailAppt] = useState(null);

  /* Rango de fechas para cargar citas */
  const rangeStart = view === 'resourceTimeGridDay'
    ? startOfDay(currentDate).toISOString()
    : startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();

  const rangeEnd = view === 'resourceTimeGridDay'
    ? endOfDay(currentDate).toISOString()
    : endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals();
  const { data: appointments = [], isLoading: loadingAppts } = useAdminAppointmentsRange(rangeStart, rangeEnd);

  const resources = buildResources(professionals);
  const events = buildEvents(appointments);

  /* Header label */
  const headerLabel = view === 'resourceTimeGridDay'
    ? format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })} — ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}`;

  /* Navegación */
  function navigate(direction) {
    const cal = calendarRef.current?.getApi();
    if (!cal) return;
    direction === 'prev' ? cal.prev() : cal.next();
    setCurrentDate(cal.getDate());
  }

  function goToday() {
    const cal = calendarRef.current?.getApi();
    if (!cal) return;
    cal.today();
    setCurrentDate(cal.getDate());
  }

  function switchView(v) {
    const cal = calendarRef.current?.getApi();
    if (!cal) return;
    setView(v);
    cal.changeView(v);
  }

  /* Click en slot vacío → modal nueva cita */
  const handleDateClick = useCallback((info) => {
    setNewModal({
      date: info.dateStr,
      profesionalId: info.resource?.id || '',
    });
  }, []);

  /* Click en evento → modal detalle */
  const handleEventClick = useCallback((info) => {
    const appt = info.event.extendedProps?.appointment;
    if (appt) setDetailAppt(appt);
  }, []);

  /* Arrastre → no implementado aquí, solo click */
  const isLoading = loadingProfs || loadingAppts;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
        {/* Left: date nav */}
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[#131b2e] capitalize">{headerLabel}</h2>
          <div className="flex items-center bg-[#f2f3ff] rounded-lg p-1 gap-0.5">
            <button
              onClick={() => navigate('prev')}
              className="px-2 py-1.5 rounded-md hover:bg-white transition-colors text-[#494454]"
              aria-label="Anterior"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-[0.75rem] font-bold text-[#6b38d4] hover:bg-white rounded-md transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => navigate('next')}
              className="px-2 py-1.5 rounded-md hover:bg-white transition-colors text-[#494454]"
              aria-label="Siguiente"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Right: view switcher + new button */}
        <div className="flex items-center gap-3">
          {/* Vista */}
          <div className="flex bg-[#f2f3ff] rounded-lg p-1">
            <button
              onClick={() => switchView('resourceTimeGridDay')}
              className={`px-4 py-1.5 text-[0.8rem] font-bold rounded-md transition-all ${
                view === 'resourceTimeGridDay'
                  ? 'bg-white text-[#6b38d4] shadow-sm'
                  : 'text-[#494454] hover:text-[#131b2e]'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => switchView('timeGridWeek')}
              className={`px-4 py-1.5 text-[0.8rem] font-bold rounded-md transition-all ${
                view === 'timeGridWeek'
                  ? 'bg-white text-[#6b38d4] shadow-sm'
                  : 'text-[#494454] hover:text-[#131b2e]'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Nueva cita */}
          <button
            onClick={() => setNewModal({ date: new Date().toISOString(), profesionalId: '' })}
            className="flex items-center gap-2 px-4 py-2 bg-[#6b38d4] text-white rounded-lg font-bold text-[0.875rem] hover:brightness-110 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Calendar container */}
      <div className="flex-1 bg-white rounded-xl border border-[#cbc3d7]/20 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-[#6b38d4] text-3xl">refresh</span>
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimeGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          resources={resources}
          events={events}
          /* Configuración de slots: 15 min */
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          /* Localización */
          locale="es"
          firstDay={1}
          allDaySlot={false}
          /* Interacción */
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          selectable={false}
          nowIndicator
          /* Cabecera personalizada: usamos la nuestra */
          headerToolbar={false}
          /* Altura */
          height="100%"
          /* Columna de recurso custom */
          resourceLabelContent={(arg) => <ResourceHeader resource={arg.resource} />}
          /* Estilos de eventos */
          eventClassNames="cursor-pointer"
          /* Slot label */
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </div>

      {/* Leyenda de profesionales */}
      {professionals.length > 0 && (
        <div className="flex items-center gap-4 shrink-0 px-1 flex-wrap">
          {professionals.map((p) => (
            <LegendChip key={p._id} color={p.color || '#6b38d4'} label={p.nombre} />
          ))}
        </div>
      )}

      {/* Modales */}
      {newModal && (
        <NewAppointmentModal
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
