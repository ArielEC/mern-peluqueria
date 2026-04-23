import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { invalidateAndSyncGroups } from '@/lib/querySync';

// Keys para React Query
export const authKeys = {
  all: ['auth'],
  me: () => [...authKeys.all, 'me'],
};

// Hook para login
export const useLogin = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
    },
  });
};

// Hook para registro
export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData) => {
      const { data } = await api.post('/auth/register', userData);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      return invalidateAndSyncGroups(queryClient, 'clients');
    },
  });
};

// Hook para obtener usuario actual
export const useMe = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    enabled: isAuthenticated,
  });
};

// Hook para logout — limpia estado, caché y redirige a /login sin `from` state
export const useLogout = () => {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();
    // Redirigir a login sin state.from para que el próximo login
    // no vuelva a la ruta del rol anterior
    window.location.replace('/login');
  };
};
