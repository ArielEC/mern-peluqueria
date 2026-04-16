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
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

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
        </Route>
        {/* Confirmación — layout propio (pantalla enfocada) */}
        <Route path="/booking/confirmed" element={<BookingConfirmedPage />} />
      </Route>

      {/* Rutas protegidas (admin) — PA-01 */}
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
