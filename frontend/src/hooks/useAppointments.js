import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const appointmentsKeys = {
  all: ['appointments'],
  list: (params) => [...appointmentsKeys.all, 'list', params],
};

export const useCreateAppointment = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments', payload);
      return data;
    },
  });
};

export const useAppointments = (params = {}) => {
  return useQuery({
    queryKey: appointmentsKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params });
      // La API devuelve un array directamente
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 30 * 1000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
  });
};
