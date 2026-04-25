const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SYNC_CHANNEL_NAME = 'mern-peluqueria-query-sync';
const SYNC_STORAGE_KEY = '__mern_peluqueria_query_sync__';
const AUTO_SYNC_INTERVAL_MS = 15000;
const SERVER_SYNC_URL = `${API_BASE_URL}/query-sync/stream`;

const globalScope = typeof globalThis !== 'undefined' ? globalThis : {};
const sharedSyncState = globalScope.__MERN_PELUQUERIA_QUERY_SYNC__ || {
  initialized: false,
  queryClient: null,
  channel: null,
  eventSource: null,
  tabId: null,
  serverSyncInitialized: false,
};

if (typeof globalThis !== 'undefined') {
  globalThis.__MERN_PELUQUERIA_QUERY_SYNC__ = sharedSyncState;
}

const sharedQueryGroups = {
  services: [
    ['services'],
    ['admin', 'services'],
    ['appointments'],
    ['admin', 'appointments'],
    ['availability'],
  ],
  professionals: [
    ['professionals'],
    ['admin', 'professionals'],
    ['services'],
    ['admin', 'services'],
    ['appointments'],
    ['admin', 'appointments'],
    ['availability'],
  ],
  blockers: [
    ['admin', 'blockers'],
    ['availability'],
  ],
  settings: [
    ['settings'],
    ['admin', 'settings'],
    ['availability'],
  ],
  appointments: [
    ['appointments'],
    ['admin', 'appointments'],
    ['availability'],
  ],
  clients: [
    ['admin', 'clients'],
  ],
  technicalNotes: [
    ['admin', 'technical-notes'],
  ],
};

function canUseBrowserSync() {
  return typeof window !== 'undefined';
}

function getTabId() {
  if (!sharedSyncState.tabId) {
    sharedSyncState.tabId = window.crypto?.randomUUID?.()
      || `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  return sharedSyncState.tabId;
}

function dedupeQueryKeys(queryKeys) {
  const seen = new Set();

  return queryKeys.filter((queryKey) => {
    const serialized = JSON.stringify(queryKey);

    if (seen.has(serialized)) {
      return false;
    }

    seen.add(serialized);
    return true;
  });
}

function resolveQueryKeys(groupNames) {
  return dedupeQueryKeys(
    groupNames.flatMap((groupName) => sharedQueryGroups[groupName] || [])
  );
}

function invalidateQueryKeys(queryClient, queryKeys) {
  if (!queryClient || queryKeys.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({
      queryKey,
      refetchType: 'active',
    }))
  );
}

function resolvePayloadQueryKeys(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.queryKeys) && payload.queryKeys.length > 0) {
    return dedupeQueryKeys(payload.queryKeys);
  }

  if (Array.isArray(payload.groupNames) && payload.groupNames.length > 0) {
    return resolveQueryKeys(payload.groupNames);
  }

  return [];
}

function handleSyncPayload(payload, { ignoreOwnSource = true } = {}) {
  if (
    !payload
    || payload.type !== 'invalidate-queries'
    || (ignoreOwnSource && payload.sourceId === getTabId())
  ) {
    return;
  }

  const queryKeys = resolvePayloadQueryKeys(payload);

  if (queryKeys.length === 0) {
    return;
  }

  void invalidateQueryKeys(sharedSyncState.queryClient, queryKeys);
}

function broadcastPayload(payload) {
  if (!canUseBrowserSync()) {
    return;
  }

  sharedSyncState.channel?.postMessage(payload);

  try {
    window.localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

function connectServerSync() {
  if (
    !canUseBrowserSync()
    || typeof window.EventSource === 'undefined'
    || sharedSyncState.eventSource
  ) {
    return;
  }

  const eventSource = new window.EventSource(SERVER_SYNC_URL);
  sharedSyncState.eventSource = eventSource;

  const handleServerMessage = (event) => {
    if (!event?.data) {
      return;
    }

    try {
      handleSyncPayload(JSON.parse(event.data), { ignoreOwnSource: false });
    } catch {
      // Ignore malformed events.
    }
  };

  eventSource.addEventListener('invalidate-queries', handleServerMessage);
  eventSource.onerror = () => {
    if (sharedSyncState.eventSource !== eventSource) {
      return;
    }

    // Dejamos que EventSource reintente la conexión automáticamente.
    // Solo limpiamos la referencia si el stream se ha cerrado por completo.
    if (eventSource.readyState === window.EventSource.CLOSED) {
      sharedSyncState.eventSource = null;
      connectServerSync();
    }
  };
}

export function setupCrossTabQuerySync(queryClient) {
  if (!canUseBrowserSync()) {
    return;
  }

  sharedSyncState.queryClient = queryClient;

  if (sharedSyncState.initialized) {
    return;
  }

  sharedSyncState.initialized = true;

  if ('BroadcastChannel' in window) {
    sharedSyncState.channel = new window.BroadcastChannel(SYNC_CHANNEL_NAME);
    sharedSyncState.channel.onmessage = (event) => {
      handleSyncPayload(event.data);
    };
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== SYNC_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      handleSyncPayload(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed payloads.
    }
  });
}

export function setupServerQuerySync(queryClient) {
  if (!canUseBrowserSync()) {
    return;
  }

  sharedSyncState.queryClient = queryClient;

  if (sharedSyncState.serverSyncInitialized) {
    return;
  }

  sharedSyncState.serverSyncInitialized = true;
  connectServerSync();

  window.addEventListener('online', connectServerSync);
}

export function invalidateAndSyncGroups(queryClient, ...groupNames) {
  const queryKeys = resolveQueryKeys(groupNames);

  if (queryKeys.length === 0) {
    return Promise.resolve();
  }

  const payload = canUseBrowserSync()
    ? {
        type: 'invalidate-queries',
        sourceId: getTabId(),
        groupNames,
        queryKeys,
        timestamp: Date.now(),
      }
    : null;

  return invalidateQueryKeys(queryClient, queryKeys).finally(() => {
    if (payload) {
      broadcastPayload(payload);
    }
  });
}

export function getAutoSyncQueryOptions(intervalMs = AUTO_SYNC_INTERVAL_MS) {
  return {
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  };
}
