import { useAdminTodayAppointments, useAdminWeekAppointments } from '@/hooks/useAdminDashboard';
import useAuthStore from '@/stores/authStore';

/* ── helpers ── */
function formatHour(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const STATUS_STYLES = {
  pendiente: 'bg-[#eaedff] text-[#494454]',
  confirmada: 'bg-[#e9ddff] text-[#4e3b7c]',
  'en-curso': 'bg-[#ffdcbb] text-[#673d00]',
  completada: 'bg-[#e9ddff] text-[#544183]',
  cancelada: 'bg-[#ffdad6] text-[#93000a]',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  'en-curso': 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

/* ── KPI card ── */
function KpiCard({ icon, label, value, badge, iconColor = 'text-[#6b38d4]', iconBg = 'bg-[#6b38d4]/10' }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-[#cbc3d7]/20 shadow-[0_12px_40px_-12px_hsla(262,83%,10%,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-2 rounded-lg`}>{icon}</span>
        {badge && (
          <span className="text-[0.65rem] font-bold text-[#673d00] bg-[#ffdcbb] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[#494454] text-[0.8rem] font-medium">{label}</p>
      <h3 className="text-[1.75rem] font-bold text-[#131b2e] mt-1 tabular-nums">{value}</h3>
    </div>
  );
}

/* ── appointment row ── */
function AppointmentRow({ appt }) {
  const clientName = appt.cliente?.nombre || appt.nombreTercero || 'Cliente';
  const profName = appt.profesional?.nombre || '—';
  const serviceName = appt.servicio?.nombre || '—';
  const status = appt.estado || 'pendiente';

  return (
    <tr className="hover:bg-[#f2f3ff]/40 transition-colors">
      <td className="px-6 py-4 font-medium text-[#131b2e] tabular-nums">{formatHour(appt.fechaHora)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#e2e7ff] flex items-center justify-center text-xs font-bold text-[#6b38d4] shrink-0">
            {getInitials(clientName)}
          </div>
          <span className="text-[#131b2e] text-[0.875rem]">{clientName}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-[#494454] text-[0.875rem]">{serviceName}</td>
      <td className="px-6 py-4 text-[#131b2e] text-[0.875rem]">{profName}</td>
      <td className="px-6 py-4">
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
  const { data: todayAppts = [], isLoading: loadingToday } = useAdminTodayAppointments();
  const { data: weekAppts = [], isLoading: loadingWeek } = useAdminWeekAppointments();

  const pendingCount = todayAppts.filter((a) => a.estado === 'pendiente').length;

  return (
    <div className="flex flex-col gap-8 max-w-7xl">
      {/* Welcome */}
      <section>
        <h2 className="text-[2.25rem] font-bold tracking-[-0.02em] text-[#131b2e]">
          Bienvenido, {user?.nombre?.split(' ')[0] ?? 'Admin'}
        </h2>
        <p className="text-[#494454] text-[0.9rem] mt-1">
          Resumen del panel — {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon="event_available"
          label="Citas hoy"
          value={loadingToday ? '…' : todayAppts.length}
        />
        <KpiCard
          icon="calendar_today"
          label="Próximos 7 días"
          value={loadingWeek ? '…' : weekAppts.length}
        />
        <KpiCard
          icon="pending_actions"
          label="Pendientes hoy"
          value={loadingToday ? '…' : pendingCount}
          badge={pendingCount > 0 ? 'Atención' : null}
          iconColor="text-[#665396]"
          iconBg="bg-[#665396]/10"
        />
        <KpiCard
          icon="today"
          label="Fecha"
          value={new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Tabla citas de hoy */}
        <div className="xl:col-span-2 bg-[#f2f3ff] rounded-xl overflow-hidden p-1">
          <div className="bg-white rounded-[0.625rem] border border-[#cbc3d7]/10">
            <div className="p-6 border-b border-[#cbc3d7]/20 flex items-center justify-between">
              <h3 className="font-bold text-[#131b2e]">Citas de Hoy</h3>
              <span className="text-[#494454] text-[0.75rem]">
                {loadingToday ? 'Cargando…' : `${todayAppts.length} citas`}
              </span>
            </div>

            {loadingToday ? (
              <div className="p-12 flex items-center justify-center text-[#494454] text-[0.875rem]">
                <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                Cargando citas…
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="p-12 text-center text-[#494454] text-[0.875rem]">
                <span className="material-symbols-outlined text-4xl text-[#cbc3d7] block mb-2">event_busy</span>
                No hay citas para hoy
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[#494454] text-[0.7rem] bg-[#f2f3ff]/50">
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Hora</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Servicio</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Profesional</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cbc3d7]/10">
                    {todayAppts.map((appt) => (
                      <AppointmentRow key={appt._id} appt={appt} />
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
          <div className="bg-[#6b38d4] p-8 rounded-xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#8455ef]/20 rounded-full blur-3xl" />
            <h4 className="font-bold text-lg relative z-10">Panel de Control</h4>
            <p className="text-white/80 text-[0.875rem] mt-2 relative z-10">
              {weekAppts.length > 0
                ? `Tienes ${weekAppts.length} citas en los próximos 7 días.`
                : 'Sin citas programadas esta semana.'}
            </p>
            <div className="mt-8 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[0.65rem] opacity-70 font-bold uppercase tracking-widest">Esta semana</p>
                <p className="text-2xl font-black mt-1">{loadingWeek ? '…' : weekAppts.length} citas</p>
              </div>
              <span className="material-symbols-outlined text-4xl opacity-20">trending_up</span>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white p-6 rounded-xl border border-[#cbc3d7]/20">
            <h4 className="font-bold text-[#131b2e] mb-4">Accesos Rápidos</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Calendario', to: '/admin/calendario', icon: 'calendar_month' },
                { label: 'Gestionar Servicios', to: '/admin/servicios', icon: 'content_cut' },
                { label: 'Gestionar Profesionales', to: '/admin/profesionales', icon: 'badge' },
                { label: 'Ver Clientes', to: '/admin/clientes', icon: 'group' },
              ].map(({ label, to, icon }) => (
                <a
                  key={to}
                  href={to}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#f2f3ff] hover:bg-[#e2e7ff] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#6b38d4]">{icon}</span>
                    <span className="text-[0.875rem] font-medium text-[#131b2e]">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[#6b38d4] group-hover:translate-x-1 transition-transform">
                    chevron_right
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
