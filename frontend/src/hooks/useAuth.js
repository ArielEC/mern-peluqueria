import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getErrorMessage, notifyError, notifySuccess } from '@/lib/notifications';
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
      notifySuccess('Sesión iniciada con éxito');
    },
    onError: (error) => notifyError(getErrorMessage(error, 'No se ha podido iniciar sesión')),
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
      notifySuccess('Cuenta creada con éxito');
      return invalidateAndSyncGroups(queryClient, 'clients');
    },
    onError: (error) => notifyError(getErrorMessage(error, 'No se ha podido crear la cuenta')),
  });
};

// Hook para obtener usuario actual
export const useMe = () => {
  const { isAuthenticated, updateUser } = useAuthStore();

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      if (data?.user) {
        updateUser(data.user);
      }
      return data;
    },
    enabled: isAuthenticated,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put('/auth/me', payload);
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) {
        updateUser(data.user);
        queryClient.setQueryData(authKeys.me(), { user: data.user });
      }

      void invalidateAndSyncGroups(queryClient, 'clients');
      notifySuccess('Perfil actualizado con éxito');
    },
    onError: (error) => notifyError(getErrorMessage(error, 'No se ha podido actualizar el perfil')),
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put('/auth/change-password', payload);
      return data;
    },
    onSuccess: () => {
      notifySuccess('Contraseña actualizada. Inicia sesión de nuevo');

      window.setTimeout(() => {
        useAuthStore.getState().logout();
        queryClient.clear();
        window.location.replace('/login');
      }, 1200);
    },
    onError: (error) => notifyError(getErrorMessage(error, 'No se ha podido cambiar la contraseña')),
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
