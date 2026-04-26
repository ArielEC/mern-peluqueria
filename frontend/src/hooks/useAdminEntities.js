import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getErrorMessage, notifyError, notifySuccess } from '@/lib/notifications';
import { getAutoSyncQueryOptions, invalidateAndSyncGroups } from '@/lib/querySync';

function notifyMutationError(error, fallback) {
  notifyError(getErrorMessage(error, fallback));
}

const servicesAdminKeys = {
  all: ['admin', 'services'],
  list: () => [...servicesAdminKeys.all, 'list'],
};

export function useAdminServices() {
  return useQuery({
    queryKey: servicesAdminKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/services');
      return Array.isArray(data) ? data : data.services ?? [];
    },
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateService() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/services', body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'services');
      notifySuccess('Servicio creado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido crear el servicio'),
  });
}

export function useAdminUpdateService() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/services/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'services');
      notifySuccess('Servicio actualizado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido actualizar el servicio'),
  });
}

export function useAdminDeleteService() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/services/${id}`);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'services');
      notifySuccess('Servicio eliminado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido eliminar el servicio'),
  });
}

const profAdminKeys = {
  all: ['admin', 'professionals'],
  list: () => [...profAdminKeys.all, 'list'],
};

export function useAdminProfessionals() {
  return useQuery({
    queryKey: profAdminKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/professionals');
      return Array.isArray(data) ? data : data.professionals ?? [];
    },
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateProfessional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/professionals', body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'professionals');
      notifySuccess('Profesional creado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido crear el profesional'),
  });
}

export function useAdminUpdateProfessional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/professionals/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'professionals');
      notifySuccess('Profesional actualizado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido actualizar el profesional'),
  });
}

export function useAdminDeleteProfessional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/professionals/${id}`);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'professionals');
      notifySuccess('Profesional eliminado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido eliminar el profesional'),
  });
}

const blockersAdminKeys = {
  all: ['admin', 'blockers'],
  list: () => [...blockersAdminKeys.all, 'list'],
};

export function useAdminBlockers() {
  return useQuery({
    queryKey: blockersAdminKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/blockers');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateBlocker() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/blockers', body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'blockers');
      notifySuccess('Bloqueo creado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido crear el bloqueo'),
  });
}

export function useAdminUpdateBlocker() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/blockers/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'blockers');
      notifySuccess('Bloqueo actualizado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido actualizar el bloqueo'),
  });
}

export function useAdminDeleteBlocker() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/blockers/${id}`);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'blockers');
      notifySuccess('Bloqueo eliminado con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido eliminar el bloqueo'),
  });
}

const clientsAdminKeys = {
  all: ['admin', 'clients'],
  list: (search, activo) => [...clientsAdminKeys.all, 'list', search, activo ?? 'all'],
};

export function useAdminClients(search = '', options = {}) {
  const { activo } = options;

  return useQuery({
    queryKey: clientsAdminKeys.list(search, activo),
    queryFn: async () => {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (activo !== undefined) params.activo = String(activo);

      const { data } = await api.get('/auth/clients', { params });

      if (data && Array.isArray(data.clients)) {
        return data.clients;
      }

      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminUpdateClientStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, activo }) => {
      const { data } = await api.put(`/auth/clients/${id}/status`, { activo });
      return data?.client ?? data;
    },
    onSuccess: (_, variables) => {
      invalidateAndSyncGroups(qc, 'clients');
      notifySuccess(`Cliente ${variables.activo ? 'activado' : 'desactivado'} con éxito`);
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido actualizar el estado del cliente'),
  });
}

const settingsAdminKeys = {
  all: ['admin', 'settings'],
  get: () => [...settingsAdminKeys.all, 'get'],
};

export function useAdminSettings() {
  return useQuery({
    queryKey: settingsAdminKeys.get(),
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.put('/settings', body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'settings');
      notifySuccess('Ajustes guardados con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se han podido guardar los ajustes'),
  });
}

const notesAdminKeys = {
  all: ['admin', 'technical-notes'],
  byClient: (clienteId) => [...notesAdminKeys.all, clienteId],
};

export function useAdminTechnicalNotes(clienteId) {
  return useQuery({
    queryKey: notesAdminKeys.byClient(clienteId),
    queryFn: async () => {
      const { data } = await api.get('/technical-notes', { params: { clienteId } });
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(clienteId),
    staleTime: 30 * 1000,
    ...getAutoSyncQueryOptions(),
  });
}

export function useAdminCreateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/technical-notes', body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'technicalNotes');
      notifySuccess('Nota técnica creada con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido crear la nota técnica'),
  });
}

export function useAdminUpdateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/technical-notes/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'technicalNotes');
      notifySuccess('Nota técnica actualizada con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido actualizar la nota técnica'),
  });
}

export function useAdminDeleteNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/technical-notes/${id}`);
      return data;
    },
    onSuccess: () => {
      invalidateAndSyncGroups(qc, 'technicalNotes');
      notifySuccess('Nota técnica eliminada con éxito');
    },
    onError: (error) => notifyMutationError(error, 'No se ha podido eliminar la nota técnica'),
  });
}
