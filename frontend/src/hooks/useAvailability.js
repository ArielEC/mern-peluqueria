import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions } from '@/lib/querySync';

export const availabilityKeys = {
  all: ['availability'],
  byDateAndService: (fecha, servicioId, profesionalId = '') => [...availabilityKeys.all, fecha, servicioId, profesionalId],
};

export const useAvailability = (fecha, servicioId, profesionalId = '') => {
  return useQuery({
    queryKey: availabilityKeys.byDateAndService(fecha, servicioId, profesionalId),
    queryFn: async () => {
      const { data } = await api.get('/availability', {
        params: {
          fecha,
          servicioId,
          ...(profesionalId ? { profesionalId } : {}),
        },
      });
      return data;
    },
    enabled: !!fecha && !!servicioId,
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
};
