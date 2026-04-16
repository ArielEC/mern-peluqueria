import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';

const NAV_ITEMS = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/admin/calendario', icon: 'calendar_month', label: 'Calendario' },
  { to: '/admin/servicios', icon: 'content_cut', label: 'Servicios' },
  { to: '/admin/profesionales', icon: 'badge', label: 'Profesionales' },
  { to: '/admin/bloqueos', icon: 'block', label: 'Bloqueos' },
  { to: '/admin/clientes', icon: 'group', label: 'Clientes' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.nombre
    ? user.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="h-screen w-64 left-0 top-0 fixed bg-[#f2f3ff] border-r border-[#6b38d4]/10 flex flex-col gap-2 p-4 z-50">
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-lg font-black text-[#131b2e]">Atelier Admin</h1>
        <p className="text-[0.875rem] text-[#494454]">Panel de Administración</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2.5 bg-white text-[#6b38d4] font-semibold rounded-lg shadow-sm transition-all duration-200'
                : 'flex items-center gap-3 px-3 py-2.5 text-[#494454] hover:bg-white/50 rounded-lg transition-all duration-200'
            }
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="text-[0.875rem] tracking-tight">{label}</span>
          </NavLink>
        ))}

        {/* Settings al fondo del nav */}
        <div className="mt-auto">
          <NavLink
            to="/admin/ajustes"
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2.5 bg-white text-[#6b38d4] font-semibold rounded-lg shadow-sm transition-all duration-200'
                : 'flex items-center gap-3 px-3 py-2.5 text-[#494454] hover:bg-white/50 rounded-lg transition-all duration-200'
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[0.875rem] tracking-tight">Ajustes</span>
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="mt-4 pt-4 border-t border-[#6b38d4]/10 flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-xl bg-[#8455ef] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[0.75rem] font-bold text-[#131b2e] truncate">{user?.nombre || 'Administrador'}</p>
          <p className="text-[0.65rem] text-[#494454] truncate">{user?.email || ''}</p>
        </div>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="shrink-0 text-[#494454] hover:text-[#6b38d4] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </aside>
  );
}
