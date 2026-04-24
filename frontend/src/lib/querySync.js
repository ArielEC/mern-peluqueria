const SYNC_CHANNEL_NAME = 'mern-peluqueria-query-sync';
const SYNC_STORAGE_KEY = '__mern_peluqueria_query_sync__';
const AUTO_SYNC_INTERVAL_MS = 15000;

const globalScope = typeof globalThis !== 'undefined' ? globalThis : {};
const sharedSyncState = globalScope.__MERN_PELUQUERIA_QUERY_SYNC__ || {
  initialized: false,
  queryClient: null,
  channel: null,
  tabId: null,
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

function handleSyncPayload(payload) {
  if (
    !payload
    || payload.type !== 'invalidate-queries'
    || payload.sourceId === getTabId()
    || !Array.isArray(payload.queryKeys)
    || payload.queryKeys.length === 0
  ) {
    return;
  }

  void invalidateQueryKeys(
    sharedSyncState.queryClient,
    dedupeQueryKeys(payload.queryKeys)
  );
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

export function invalidateAndSyncGroups(queryClient, ...groupNames) {
  const queryKeys = resolveQueryKeys(groupNames);

  if (queryKeys.length === 0) {
    return Promise.resolve();
  }

  const payload = canUseBrowserSync()
    ? {
        type: 'invalidate-queries',
        sourceId: getTabId(),
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
