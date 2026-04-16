import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#faf8ff]">
      <AdminSidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <AdminHeader />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
