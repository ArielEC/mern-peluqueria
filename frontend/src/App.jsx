import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

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

      {/* Rutas protegidas (cliente) — se completarán en FC-03 y FC-04 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* /book → FC-03 */}
          {/* /appointments → FC-04 */}
        </Route>
      </Route>

      {/* Rutas protegidas (admin) — se completarán en PA-01 */}
      <Route element={<ProtectedRoute adminOnly />}>
        {/* /admin/* → PA-01 */}
      </Route>
    </Routes>
  );
}

export default App;
