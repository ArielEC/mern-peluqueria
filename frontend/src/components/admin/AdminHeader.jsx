import { useLocation } from 'react-router-dom';

const BREADCRUMB_MAP = {
  '/admin': 'Dashboard',
  '/admin/calendario': 'Calendario',
  '/admin/servicios': 'Servicios',
  '/admin/profesionales': 'Profesionales',
  '/admin/bloqueos': 'Bloqueos',
  '/admin/clientes': 'Clientes',
  '/admin/ajustes': 'Ajustes',
};

export default function AdminHeader({ onToggleSidebar }) {
  const { pathname } = useLocation();
  const current = BREADCRUMB_MAP[pathname] ?? 'Admin';

  return (
    <header className="h-16 px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 bg-[#faf8ff]/80 backdrop-blur-xl z-40 border-b border-[#6b38d4]/5 gap-3">
      {/* Mobile hamburger + Breadcrumb */}
      <div className="flex items-center gap-2 text-[0.75rem] font-medium tracking-tight min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-[#eaedff] transition-colors text-[#494454] mr-1"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <span className="text-[#494454]">Admin</span>
        <span className="material-symbols-outlined text-[14px] text-[#cbc3d7]">chevron_right</span>
        <span className="text-[#6b38d4] font-bold truncate">{current}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#eaedff] transition-colors text-[#494454]">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#eaedff] transition-colors text-[#494454]">
          <span className="material-symbols-outlined">search</span>
        </button>
      </div>
    </header>
  );
}
