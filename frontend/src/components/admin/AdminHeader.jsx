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

export default function AdminHeader({ onToggleSidebar, sidebarVisible = true }) {
  const { pathname } = useLocation();
  const current = BREADCRUMB_MAP[pathname] ?? 'Admin';
  const sidebarLabel = sidebarVisible ? 'Ocultar barra lateral' : 'Mostrar barra lateral';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#6b38d4]/5 bg-[#faf8ff]/80 px-4 backdrop-blur-xl sm:px-6 md:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[0.75rem] font-medium tracking-tight">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="mr-1 rounded-lg p-2 text-[#494454] transition-colors hover:bg-[#eaedff]"
            aria-label={sidebarLabel}
            title={sidebarLabel}
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <span className="text-[#494454]">Admin</span>
        <span className="material-symbols-outlined text-[14px] text-[#cbc3d7]">chevron_right</span>
        <span className="truncate font-bold text-[#6b38d4]">{current}</span>
      </div>
    </header>
  );
}
