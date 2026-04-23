import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions, invalidateAndSyncGroups } from '@/lib/querySync';

export const adminApptKeys = {
  all: ['admin', 'appointments'],
  range: (desde, hasta) => [...adminApptKeys.all, 'range', desde, hasta],
};

export function useAdminAppointmentsRange(desde, hasta) {
  return useQuery({
    queryKey: adminApptKeys.range(desde, hasta),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    enabled: Boolean(desde && hasta),
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments', payload);
      return data;
    },
    onSuccess: () => invalidateAndSyncGroups(queryClient, 'appointments'),
  });
}

export function useAdminUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/appointments/${id}`, body);
      return data;
    },
    onSuccess: () => invalidateAndSyncGroups(queryClient, 'appointments'),
  });
}

export function useAdminCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivoCancelacion }) => {
      const { data } = await api.delete(`/appointments/${id}`, {
        data: { motivoCancelacion },
      });
      return data;
    },
    onSuccess: () => invalidateAndSyncGroups(queryClient, 'appointments'),
  });
}
