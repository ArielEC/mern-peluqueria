import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions } from '@/lib/querySync';

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
    staleTime: 30 * 1000, // 30s — se invalida desde admin al activar/desactivar
    refetchOnMount: 'always', // refetch al montar para reflejar cambios de admin
    ...getAutoSyncQueryOptions(),
  });
};
