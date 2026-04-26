import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import BookingPage from '@/pages/BookingPage';
import BookingConfirmedPage from '@/pages/BookingConfirmedPage';
import MyAppointmentsPage from '@/pages/MyAppointmentsPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage';
import ServicesPage from '@/pages/admin/ServicesPage';
import ProfessionalsPage from '@/pages/admin/ProfessionalsPage';
import BlockersPage from '@/pages/admin/BlockersPage';
import ClientsPage from '@/pages/admin/ClientsPage';
import SettingsPage from '@/pages/admin/SettingsPage';

function App() {
  return (
    <Routes>
      {/* Rutas públicas con Layout (Header + Footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      {/* Rutas de autenticación — layout propio */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rutas protegidas (cliente) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/book" element={<BookingPage />} />
          <Route path="/appointments" element={<MyAppointmentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        {/* Confirmación — layout propio (pantalla enfocada) */}
        <Route path="/booking/confirmed" element={<BookingConfirmedPage />} />
      </Route>

      {/* Rutas protegidas (admin) */}
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/calendario" element={<AdminCalendarPage />} />
          <Route path="/admin/servicios" element={<ServicesPage />} />
          <Route path="/admin/profesionales" element={<ProfessionalsPage />} />
          <Route path="/admin/bloqueos" element={<BlockersPage />} />
          <Route path="/admin/clientes" element={<ClientsPage />} />
          <Route path="/admin/ajustes" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* 404 — catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
