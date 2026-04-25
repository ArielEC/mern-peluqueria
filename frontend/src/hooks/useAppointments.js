import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getErrorMessage, notifyError, notifySuccess } from '@/lib/notifications';
import { getAutoSyncQueryOptions, invalidateAndSyncGroups } from '@/lib/querySync';

const APPOINTMENT_STATE_ERROR_STATUS = new Set([400, 404, 409]);

function shouldRefreshAppointmentState(error) {
  return APPOINTMENT_STATE_ERROR_STATUS.has(error?.response?.status);
}

export const appointmentsKeys = {
  all: ['appointments'],
  list: (params) => [...appointmentsKeys.all, 'list', params],
};

export const useCreateAppointment = () => {
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
};

export const useAppointments = (params = {}) => {
  return useQuery({
    queryKey: appointmentsKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params });
      return Array.isArray(data) ? data : data.appointments ?? [];
    },
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
};

export const useCancelAppointment = () => {
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
};
