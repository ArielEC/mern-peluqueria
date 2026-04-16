import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import api from '@/lib/api';

/**
 * Formatea una fecha local como "YYYY-MM-DD".
 * Enviar strings de fecha (sin hora) al backend es preferible a ISO datetimes locales,
 * porque el backend los interpreta en la TZ del negocio correctamente.
 */
function toDateStr(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Citas de hoy — el backend interpreta `desde`/`hasta` como inicio/fin del día
 * en la zona horaria del negocio.
 */
export function useAdminTodayAppointments() {
  return useQuery({
    queryKey: ['admin', 'appointments', 'today'],
    queryFn: async () => {
      const today = toDateStr(new Date());
      const { data } = await api.get('/appointments', { params: { desde: today, hasta: today } });
      const list = Array.isArray(data) ? data : data.appointments ?? [];
      return list.sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio));
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Citas de los próximos 7 días (hoy inclusive).
 * Envía strings de fecha para que el backend aplique la TZ del negocio.
 */
export function useAdminWeekAppointments() {
  return useQuery({
    queryKey: ['admin', 'appointments', 'week'],
    queryFn: async () => {
      const today = new Date();
      const desde = toDateStr(today);
      const hasta = toDateStr(addDays(today, 6));
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 60 * 1000,
  });
}
