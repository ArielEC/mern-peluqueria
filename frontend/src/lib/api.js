import axios from 'axios';
import useAuthStore from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token expiró o es inválido, hacer logout.
    // Excluir rutas de autenticación para no recargar la página al fallar login/registro.
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      if (!isAuthRoute) {
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
