import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getErrorMessage, notifyError, notifySuccess } from '@/lib/notifications';
import { getAutoSyncQueryOptions, invalidateAndSyncGroups } from '@/lib/querySync';

const APPOINTMENT_STATE_ERROR_STATUS = new Set([400, 404, 409]);

function shouldRefreshAppointmentState(error) {
  return APPOINTMENT_STATE_ERROR_STATUS.has(error?.response?.status);
}

export const adminApptKeys = {
  all: ['admin', 'appointments'],
  range: (desde, hasta) => [...adminApptKeys.all, 'range', desde, hasta],
};

export function useAdminAppointmentsRange(desde, hasta) {
  return useQuery({
    queryKey: adminApptKeys.range(desde, hasta),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { desde, hasta } });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    enabled: Boolean(desde && hasta),
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments', payload);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(queryClient, 'appointments');
      notifySuccess('Cita creada con éxito');
    },
    onError: (error) => {
      if (shouldRefreshAppointmentState(error)) {
        void invalidateAndSyncGroups(
          queryClient,
          'appointments',
          'professionals',
          'services',
          'blockers',
          'settings'
        );
      }

      notifyError(getErrorMessage(error, 'No se ha podido crear la cita'));
    },
  });
}

export function useAdminUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/appointments/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(queryClient, 'appointments');
      notifySuccess('Cita actualizada con éxito');
    },
    onError: (error) => {
      if (shouldRefreshAppointmentState(error)) {
        void invalidateAndSyncGroups(queryClient, 'appointments');
      }

      notifyError(getErrorMessage(error, 'No se ha podido actualizar la cita'));
    },
  });
}

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
      invalidateAndSyncGroups(queryClient, 'appointments');
      notifySuccess('Cita cancelada con éxito');
    },
    onError: (error) => {
      if (shouldRefreshAppointmentState(error)) {
        void invalidateAndSyncGroups(queryClient, 'appointments');
      }

      notifyError(getErrorMessage(error, 'No se ha podido cancelar la cita'));
    },
  });
}
