import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';

/**
 * Protege rutas que requieren autenticación.
 * - adminOnly: además exige rol ADMIN.
 * - Si el usuario es admin e intenta acceder a rutas de cliente, redirige al panel admin.
 * Guarda la ruta de origen en state para redirigir de vuelta tras el login.
 */
export default function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Admin autenticado intentando acceder a rutas de cliente → redirigir al panel admin
  if (!adminOnly && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
