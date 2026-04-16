import { useMutation, useQuery } from '@tanstack/react-query';
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
      return data;
    },
    staleTime: 30 * 1000,
  });
};
