import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
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

async function fetchAvailability({ fecha, servicioId, profesionalId = '' }) {
  const { data } = await api.get('/availability', {
    params: {
      fecha,
      servicioId,
      ...(profesionalId ? { profesionalId } : {}),
    },
  });
  return data;
}

export const useAvailability = (fecha, servicioId, profesionalId = '', businessTimezone = 'Europe/Madrid') => {
  const isPastDate = Boolean(fecha) && fecha < getTodayDateInTimezone(businessTimezone);

  return useQuery({
    queryKey: availabilityKeys.byDateAndService(fecha, servicioId, profesionalId),
    queryFn: () => fetchAvailability({ fecha, servicioId, profesionalId }),
    enabled: !!fecha && !!servicioId && !isPastDate,
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
};

export const useAvailabilityDates = (
  dateStrings,
  servicioId,
  profesionalId = '',
  businessTimezone = 'Europe/Madrid'
) => {
  const todayDate = getTodayDateInTimezone(businessTimezone);

  const queries = useQueries({
    queries: (dateStrings || []).map((fecha) => {
      const isPastDate = Boolean(fecha) && fecha < todayDate;

      return {
        queryKey: availabilityKeys.byDateAndService(fecha, servicioId, profesionalId),
        queryFn: () => fetchAvailability({ fecha, servicioId, profesionalId }),
        enabled: Boolean(fecha && servicioId) && !isPastDate,
        staleTime: 60 * 1000,
        ...getAutoSyncQueryOptions(),
      };
    }),
  });

  return useMemo(() => ({
    queries,
    byDate: new Map(
      (dateStrings || []).map((fecha, index) => [fecha, queries[index]])
    ),
    isFetchingAny: queries.some((query) => query.isFetching),
    isLoadingAny: queries.some((query) => query.isLoading),
  }), [dateStrings, queries]);
};
