import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import useUIStore from '@/stores/uiStore';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const desktopSidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleDesktopSidebar = useUIStore((state) => state.toggleSidebar);

  function handleToggleSidebar() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      toggleDesktopSidebar();
      return;
    }

    setMobileSidebarOpen((current) => !current);
  }

  return (
    <div className="flex min-h-screen bg-[#faf8ff]">
      {/* Overlay for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        desktopOpen={desktopSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-[margin] duration-200 ${
        desktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        <AdminHeader
          onToggleSidebar={handleToggleSidebar}
          sidebarVisible={desktopSidebarOpen || mobileSidebarOpen}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
