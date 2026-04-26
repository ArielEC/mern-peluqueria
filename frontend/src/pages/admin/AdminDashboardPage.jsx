import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAdminMonthAppointments,
  useAdminTodayAppointments,
  useAdminWeekAppointments,
} from '@/hooks/useAdminDashboard';
import AppointmentDetailModal from '@/components/admin/AppointmentDetailModal';
import { useSettings } from '@/hooks/useSettings';
import { formatFullDateInTz, formatTimeInTz } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';

const ACTIVE_REVENUE_STATES = new Set(['confirmada', 'completada']);

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getPluralLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Estados válidos del modelo backend: confirmada | completada | cancelada | no_presentado
const STATUS_STYLES = {
  confirmada:    'bg-[#e9ddff] text-[#4e3b7c]',
  completada:    'bg-[#e9ddff] text-[#544183]',
  cancelada:     'bg-[#ffdad6] text-[#93000a]',
  no_presentado: 'bg-[#eaedff] text-[#494454]',
};

const STATUS_LABELS = {
  confirmada:    'Confirmada',
  completada:    'Completada',
  cancelada:     'Cancelada',
  no_presentado: 'No presentado',
};

/* ── KPI card ── */
function KpiCard({
  icon,
  label,
  value,
  badge,
  note,
  valueClassName = 'mt-1 text-[1.75rem] font-bold text-[#131b2e] tabular-nums',
  iconColor = 'text-[#6b38d4]',
  iconBg = 'bg-[#6b38d4]/10',
}) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#cbc3d7]/20 shadow-[0_12px_40px_-12px_hsla(262,83%,10%,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-2 rounded-lg`}>{icon}</span>
        {badge && (
          <span className="text-[0.65rem] font-bold text-[#673d00] bg-[#ffdcbb] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[#494454] text-[0.8rem] font-medium">{label}</p>
      <h3 className={valueClassName}>{value}</h3>
      {note && <p className="mt-2 text-[0.75rem] text-[#494454]">{note}</p>}
    </div>
  );
}

/* ── appointment row ── */
function AppointmentRow({ appt, businessTimezone, onOpen }) {
  const clientName = appt.cliente?.nombre || appt.nombreTercero || 'Cliente';
  const profName = appt.profesional?.nombre || '—';
  const serviceName = appt.servicio?.nombre || '—';
  const status = appt.estado || 'confirmada';

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[#f2f3ff]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6b38d4]/35"
      onClick={() => onOpen(appt)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(appt);
        }
      }}
      tabIndex={0}
      aria-label={`Ver detalle de la cita de ${clientName}`}
    >
      <td className="px-4 sm:px-6 py-4 font-medium text-[#131b2e] tabular-nums">
        {appt.fechaHoraInicio ? formatTimeInTz(appt.fechaHoraInicio, businessTimezone) : '—'}
      </td>
      <td className="px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#e2e7ff] flex items-center justify-center text-xs font-bold text-[#6b38d4] shrink-0">
            {getInitials(clientName)}
          </div>
          <span className="text-[#131b2e] text-[0.875rem]">{clientName}</span>
        </div>
      </td>
      <td className="px-4 sm:px-6 py-4 text-[#494454] text-[0.875rem]">{serviceName}</td>
      <td className="px-4 sm:px-6 py-4 text-[#131b2e] text-[0.875rem]">{profName}</td>
      <td className="px-4 sm:px-6 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${STATUS_STYLES[status] ?? 'bg-[#eaedff] text-[#494454]'}`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </td>
    </tr>
  );
}

/* ── page ── */
export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [detailAppt, setDetailAppt] = useState(null);
  const { data: settings } = useSettings();
  const businessTimezone = settings?.zonaHoraria || 'Europe/Madrid';
  const { data: todayAppts = [], isLoading: loadingToday } = useAdminTodayAppointments(businessTimezone);
  const { data: weekAppts = [], isLoading: loadingWeek } = useAdminWeekAppointments(businessTimezone);
  const { data: monthAppts = [], isLoading: loadingMonth } = useAdminMonthAppointments(businessTimezone);

  const confirmedTodayCount = useMemo(
    () => todayAppts.filter((appointment) => appointment.estado === 'confirmada').length,
    [todayAppts]
  );
  const confirmedWeekCount = useMemo(
    () => weekAppts.filter((appointment) => appointment.estado === 'confirmada').length,
    [weekAppts]
  );
  const activeMonthAppointments = useMemo(
    () => monthAppts.filter((appointment) => ACTIVE_REVENUE_STATES.has(appointment.estado)),
    [monthAppts]
  );
  const monthRevenue = useMemo(
    () => activeMonthAppointments.reduce((sum, appointment) => (
      sum + Number(appointment.precioFinal ?? appointment.servicio?.precio ?? 0)
    ), 0),
    [activeMonthAppointments]
  );
  const noShowMonthCount = useMemo(
    () => monthAppts.filter((appointment) => appointment.estado === 'no_presentado').length,
    [monthAppts]
  );
  const topClient = useMemo(() => {
    const summary = new Map();

    activeMonthAppointments.forEach((appointment) => {
      if (appointment.cliente?.role !== 'cliente') return;

      const clientId = appointment.cliente?._id || appointment.cliente || appointment._id;
      const clientName = appointment.cliente?.nombre || appointment.nombreTercero || 'Cliente';
      const current = summary.get(clientId) || { name: clientName, visits: 0, revenue: 0 };

      current.visits += 1;
      current.revenue += Number(appointment.precioFinal ?? appointment.servicio?.precio ?? 0);
      summary.set(clientId, current);
    });

    return Array.from(summary.values()).sort((left, right) => (
      right.visits - left.visits
      || right.revenue - left.revenue
      || left.name.localeCompare(right.name, 'es')
    ))[0] ?? null;
  }, [activeMonthAppointments]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl">
      {/* Welcome */}
      <section>
        <h2 className="text-[1.75rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] text-[#131b2e]">
          Bienvenido, {user?.nombre?.split(' ')[0] ?? 'Admin'}
        </h2>
        <p className="text-[#494454] text-[0.9rem] mt-1">
          Resumen del panel — {formatFullDateInTz(new Date(), businessTimezone)}
        </p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon="pending_actions"
          label="Confirmadas hoy"
          value={loadingToday ? '…' : confirmedTodayCount}
          badge={confirmedTodayCount > 0 ? 'Activas' : null}
          note={loadingToday ? 'Actualizando citas de hoy…' : `${getPluralLabel(todayAppts.length, 'cita')} en total hoy`}
          iconColor="text-[#665396]"
          iconBg="bg-[#665396]/10"
        />
        <KpiCard
          icon="person_off"
          label="No presentados (mes)"
          value={loadingMonth ? '…' : noShowMonthCount}
          badge={noShowMonthCount > 0 ? 'Atención' : null}
          note={loadingMonth ? 'Revisando ausencias…' : `${getPluralLabel(monthAppts.length, 'cita')} registradas este mes`}
          iconColor="text-[#93000a]"
          iconBg="bg-[#93000a]/10"
        />
        <KpiCard
          icon="payments"
          label="Ingresos previstos (mes)"
          value={loadingMonth ? '…' : formatCurrency(monthRevenue)}
          note={loadingMonth ? 'Sumando reservas activas…' : `${getPluralLabel(activeMonthAppointments.length, 'reserva')} activas este mes`}
          iconColor="text-[#006e1c]"
          iconBg="bg-[#006e1c]/10"
        />
        <KpiCard
          icon="workspace_premium"
          label="Cliente top (mes)"
          value={loadingMonth ? '…' : topClient?.name ?? 'Sin datos'}
          note={loadingMonth ? 'Buscando recurrencia…' : topClient ? `${getPluralLabel(topClient.visits, 'cita')} · ${formatCurrency(topClient.revenue)}` : 'Sin citas activas este mes'}
          valueClassName="mt-1 text-[1.18rem] sm:text-[1.3rem] font-bold text-[#131b2e] leading-tight break-words"
          iconColor="text-[#855000]"
          iconBg="bg-[#855000]/10"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Tabla citas de hoy */}
        <div className="xl:col-span-2 bg-[#f2f3ff] rounded-xl overflow-hidden p-1">
          <div className="bg-white rounded-[0.625rem] border border-[#cbc3d7]/10">
            <div className="p-4 sm:p-6 border-b border-[#cbc3d7]/20 flex items-center justify-between gap-3">
              <h3 className="font-bold text-[#131b2e]">Citas de Hoy</h3>
              <span className="text-[#494454] text-[0.75rem]">
                {loadingToday ? 'Cargando…' : `${todayAppts.length} citas`}
              </span>
            </div>

            {loadingToday ? (
              <div className="p-8 sm:p-12 flex items-center justify-center text-[#494454] text-[0.875rem]">
                <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                Cargando citas…
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-[#494454] text-[0.875rem]">
                <span className="material-symbols-outlined text-4xl text-[#cbc3d7] block mb-2">event_busy</span>
                No hay citas para hoy
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[#494454] text-[0.7rem] bg-[#f2f3ff]/50">
                      <th className="px-4 sm:px-6 py-4 font-semibold uppercase tracking-wider">Hora</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold uppercase tracking-wider">Cliente</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold uppercase tracking-wider">Servicio</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold uppercase tracking-wider">Profesional</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cbc3d7]/10">
                    {todayAppts.map((appt) => (
                      <AppointmentRow
                        key={appt._id}
                        appt={appt}
                        businessTimezone={businessTimezone}
                        onOpen={setDetailAppt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel secundario */}
        <div className="flex flex-col gap-6">
          {/* Highlight card */}
          <div className="bg-[#6b38d4] p-6 sm:p-8 rounded-xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#8455ef]/20 rounded-full blur-3xl" />
            <h4 className="font-bold text-lg relative z-10">Panel de Control</h4>
            <p className="text-white/80 text-[0.875rem] mt-2 relative z-10">
              {weekAppts.length > 0
                ? `Tienes ${weekAppts.length} citas en los próximos 7 días y ${confirmedWeekCount} confirmadas.`
                : 'Sin citas programadas esta semana.'}
            </p>
            <div className="mt-6 sm:mt-8 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[0.65rem] opacity-70 font-bold uppercase tracking-widest">Esta semana</p>
                <p className="text-2xl font-black mt-1">
                  {loadingWeek ? '…' : getPluralLabel(confirmedWeekCount, 'confirmada')}
                </p>
              </div>
              <span className="material-symbols-outlined text-4xl opacity-20">trending_up</span>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#cbc3d7]/20">
            <h4 className="font-bold text-[#131b2e] mb-4">Accesos Rápidos</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Calendario', to: '/admin/calendario', icon: 'calendar_month' },
                { label: 'Gestionar Servicios', to: '/admin/servicios', icon: 'content_cut' },
                { label: 'Gestionar Profesionales', to: '/admin/profesionales', icon: 'badge' },
                { label: 'Ver Clientes', to: '/admin/clientes', icon: 'group' },
              ].map(({ label, to, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#f2f3ff] hover:bg-[#e2e7ff] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#6b38d4]">{icon}</span>
                    <span className="text-[0.875rem] font-medium text-[#131b2e]">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[#6b38d4] group-hover:translate-x-1 transition-transform">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

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
