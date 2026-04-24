import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions } from '@/lib/querySync';

export const professionalsKeys = {
  all: ['professionals'],
  list: () => [...professionalsKeys.all, 'list'],
};

export function useProfessionals() {
  return useQuery({
    queryKey: professionalsKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/professionals');
      const list = Array.isArray(data) ? data : data.professionals ?? [];
      return list.filter((p) => p.activo !== false);
    },
    staleTime: 5 * 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}
