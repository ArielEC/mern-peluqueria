import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const adminApptKeys = {
  all: ['admin', 'appointments'],
  range: (desde, hasta) => [...adminApptKeys.all, 'range', desde, hasta],
};

/** Citas en un rango de fechas ISO */
export function useAdminAppointmentsRange(desde, hasta) {
  return useQuery({
    queryKey: adminApptKeys.range(desde, hasta),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    enabled: Boolean(desde && hasta),
    staleTime: 30 * 1000,
  });
}

/** Crear cita manual (admin) */
export function useAdminCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminApptKeys.all });
      // También invalida el dashboard
      queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
    },
  });
}

/** Actualizar estado de cita (admin) */
export function useAdminUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/appointments/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminApptKeys.all });
    },
  });
}

/** Cancelar cita (admin) */
export function useAdminCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivoCancelacion }) => {
      const { data } = await api.delete(`/appointments/${id}`, {
        data: { motivoCancelacion },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminApptKeys.all });
    },
  });
}
