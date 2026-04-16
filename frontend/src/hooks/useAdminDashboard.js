import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

/**
 * Citas de hoy — el backend filtra por `desde`/`hasta` sobre fechaHoraInicio
 */
export function useAdminTodayAppointments() {
  return useQuery({
    queryKey: ['admin', 'appointments', 'today'],
    queryFn: async () => {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const hasta = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      const list = Array.isArray(data) ? data : data.appointments ?? [];
      // Ordenar ascendente por hora para la tabla
      return list.sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio));
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Citas de los próximos 7 días (desde hoy inclusive)
 */
export function useAdminWeekAppointments() {
  return useQuery({
    queryKey: ['admin', 'appointments', 'week'],
    queryFn: async () => {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59);
      const hasta = end.toISOString();
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 60 * 1000,
  });
}
