import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

/**
 * Citas de hoy (admin ve todas las citas; filtramos por fecha en cliente)
 */
export function useAdminTodayAppointments() {
  return useQuery({
    queryKey: ['admin', 'appointments', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data } = await api.get('/appointments', {
        params: { fecha: today },
      });
      return Array.isArray(data) ? data : data.appointments ?? [];
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
      const today = new Date();
      const fechaInicio = today.toISOString().split('T')[0];
      const end = new Date(today);
      end.setDate(end.getDate() + 6);
      const fechaFin = end.toISOString().split('T')[0];

      const { data } = await api.get('/appointments', {
        params: { fechaInicio, fechaFin },
      });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 60 * 1000,
  });
}
