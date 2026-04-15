import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const settingsKeys = {
  all: ['settings'],
  global: () => [...settingsKeys.all, 'global'],
};

export const useSettings = () => {
  return useQuery({
    queryKey: settingsKeys.global(),
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
