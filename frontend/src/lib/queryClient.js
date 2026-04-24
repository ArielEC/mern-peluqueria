import { QueryClient } from '@tanstack/react-query';
import { setupCrossTabQuerySync } from '@/lib/querySync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo que los datos se consideran "frescos"
      staleTime: 1000 * 60 * 5, // 5 minutos
      // Tiempo que los datos se mantienen en caché
      gcTime: 1000 * 60 * 30, // 30 minutos (antes cacheTime)
      // Reintentos en caso de error
      retry: 1,
      // Refetch en focus para sincronizar estado admin-cliente
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Reintentos para mutaciones
      retry: 0,
    },
  },
});

setupCrossTabQuerySync(queryClient);

export default queryClient;
