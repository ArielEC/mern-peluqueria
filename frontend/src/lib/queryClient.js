import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo que los datos se consideran "frescos"
      staleTime: 1000 * 60 * 5, // 5 minutos
      // Tiempo que los datos se mantienen en caché
      gcTime: 1000 * 60 * 30, // 30 minutos (antes cacheTime)
      // Reintentos en caso de error
      retry: 1,
      // No refetch automático en focus para mejor UX
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Reintentos para mutaciones
      retry: 0,
    },
  },
});

export default queryClient;
