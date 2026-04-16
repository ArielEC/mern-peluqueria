/**
 * Hooks CRUD para las entidades del panel de administración:
 * Servicios, Profesionales, Bloqueos, Clientes, Settings, Notas técnicas
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── SERVICIOS ────────────────────────────────────────────────────────────────

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
  });
}

export function useAdminCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => { const { data } = await api.post('/services', body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesAdminKeys.all }),
  });
}

export function useAdminUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => { const { data } = await api.put(`/services/${id}`, body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesAdminKeys.all }),
  });
}

export function useAdminDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { data } = await api.delete(`/services/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesAdminKeys.all }),
  });
}

// ─── PROFESIONALES ────────────────────────────────────────────────────────────

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
  });
}

export function useAdminCreateProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => { const { data } = await api.post('/professionals', body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: profAdminKeys.all }),
  });
}

export function useAdminUpdateProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => { const { data } = await api.put(`/professionals/${id}`, body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: profAdminKeys.all }),
  });
}

export function useAdminDeleteProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { data } = await api.delete(`/professionals/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: profAdminKeys.all }),
  });
}

// ─── BLOQUEOS ─────────────────────────────────────────────────────────────────

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
  });
}

export function useAdminCreateBlocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => { const { data } = await api.post('/blockers', body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: blockersAdminKeys.all }),
  });
}

export function useAdminUpdateBlocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => { const { data } = await api.put(`/blockers/${id}`, body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: blockersAdminKeys.all }),
  });
}

export function useAdminDeleteBlocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { data } = await api.delete(`/blockers/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: blockersAdminKeys.all }),
  });
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

const clientsAdminKeys = {
  all: ['admin', 'clients'],
  list: (search) => [...clientsAdminKeys.all, 'list', search],
};

export function useAdminClients(search = '') {
  return useQuery({
    queryKey: clientsAdminKeys.list(search),
    queryFn: async () => {
      const params = { limit: 50 };
      if (search) params.search = search;
      const { data } = await api.get('/auth/clients', { params });
      // El backend devuelve { clients, total, page, limit, totalPages }
      if (data && Array.isArray(data.clients)) return data.clients;
      // Compatibilidad con respuesta legacy (array directo)
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 1000,
  });
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

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
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => { const { data } = await api.put('/settings', body); return data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsAdminKeys.all });
      qc.invalidateQueries({ queryKey: ['settings'] }); // invalida también el hook público
    },
  });
}

// ─── NOTAS TÉCNICAS ───────────────────────────────────────────────────────────

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
  });
}

export function useAdminCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => { const { data } = await api.post('/technical-notes', body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesAdminKeys.all }),
  });
}

export function useAdminUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => { const { data } = await api.put(`/technical-notes/${id}`, body); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesAdminKeys.all }),
  });
}

export function useAdminDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { data } = await api.delete(`/technical-notes/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesAdminKeys.all }),
  });
}
