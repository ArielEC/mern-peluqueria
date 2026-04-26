import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAutoSyncQueryOptions } from '@/lib/querySync';

export const availabilityKeys = {
  all: ['availability'],
  byDateAndService: (fecha, servicioId, profesionalId = '') => [...availabilityKeys.all, fecha, servicioId, profesionalId],
};

function getTodayDateInTimezone(timeZone = 'Europe/Madrid') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

export const useAvailability = (fecha, servicioId, profesionalId = '', businessTimezone = 'Europe/Madrid') => {
  const isPastDate = Boolean(fecha) && fecha < getTodayDateInTimezone(businessTimezone);

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
    enabled: !!fecha && !!servicioId && !isPastDate,
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
};
