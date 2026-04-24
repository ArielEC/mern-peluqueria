import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import api from '@/lib/api';
import { getAutoSyncQueryOptions } from '@/lib/querySync';
import { formatIsoDateInTz } from '@/lib/utils';

export function useAdminTodayAppointments(businessTimezone = 'Europe/Madrid') {
  return useQuery({
    queryKey: ['admin', 'appointments', 'today', businessTimezone],
    queryFn: async () => {
      const today = formatIsoDateInTz(new Date(), businessTimezone);
      const { data } = await api.get('/appointments', { params: { desde: today, hasta: today } });
      const list = Array.isArray(data) ? data : data.appointments ?? [];
      return list.sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio));
    },
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminWeekAppointments(businessTimezone = 'Europe/Madrid') {
  return useQuery({
    queryKey: ['admin', 'appointments', 'week', businessTimezone],
    queryFn: async () => {
      const today = new Date();
      const desde = formatIsoDateInTz(today, businessTimezone);
      const hasta = formatIsoDateInTz(addDays(today, 6), businessTimezone);
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}
