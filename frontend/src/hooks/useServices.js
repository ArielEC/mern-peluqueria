import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const servicesKeys = {
  all: ['services'],
  list: () => [...servicesKeys.all, 'list'],
};

// Para el cliente: solo servicios activos
export const useServices = () => {
  return useQuery({
    queryKey: servicesKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/services', { params: { activo: 'true' } });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
