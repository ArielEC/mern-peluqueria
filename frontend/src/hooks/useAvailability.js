import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const availabilityKeys = {
  all: ['availability'],
  byDateAndService: (fecha, servicioId) => [...availabilityKeys.all, fecha, servicioId],
};

export const useAvailability = (fecha, servicioId) => {
  return useQuery({
    queryKey: availabilityKeys.byDateAndService(fecha, servicioId),
    queryFn: async () => {
      const { data } = await api.get('/availability', {
        params: { fecha, servicioId },
      });
      return data;
    },
    enabled: !!fecha && !!servicioId,
    staleTime: 60 * 1000, // 1 minuto — slots cambian con reservas recientes
  });
};
