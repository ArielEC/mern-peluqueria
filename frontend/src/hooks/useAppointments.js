import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions, invalidateAndSyncGroups } from '@/lib/querySync';

export const appointmentsKeys = {
  all: ['appointments'],
  list: (params) => [...appointmentsKeys.all, 'list', params],
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments', payload);
      return data;
    },
    onSuccess: () => invalidateAndSyncGroups(queryClient, 'appointments'),
  });
};

export const useAppointments = (params = {}) => {
  return useQuery({
    queryKey: appointmentsKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
};

export const useCancelAppointment = () => {
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
};
