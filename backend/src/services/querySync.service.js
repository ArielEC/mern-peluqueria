const QUERY_SYNC_GROUPS = new Set([
  'appointments',
  'blockers',
  'clients',
  'professionals',
  'services',
  'settings',
  'technicalNotes',
]);

const connectedClients = new Map();

function buildSseEvent(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function normalizeGroupNames(rawGroupNames) {
  return [...new Set(
    rawGroupNames
      .flat()
      .filter((groupName) => typeof groupName === 'string' && QUERY_SYNC_GROUPS.has(groupName))
  )];
}

export function registerQuerySyncClient(res) {
  const clientId = globalThis.crypto?.randomUUID?.()
    || `query-sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const heartbeatId = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeatId);
      connectedClients.delete(clientId);
      return;
    }

    res.write(buildSseEvent('heartbeat', { timestamp: Date.now() }));
  }, 25000);

  connectedClients.set(clientId, { res, heartbeatId });
  res.write('retry: 3000\n\n');
  res.write(buildSseEvent('connected', {
    clientId,
    timestamp: Date.now(),
  }));

  return () => {
    const client = connectedClients.get(clientId);

    if (!client) {
      return;
    }

    clearInterval(client.heartbeatId);
    connectedClients.delete(clientId);

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  };
}

export function emitQuerySync(...rawGroupNames) {
  const groupNames = normalizeGroupNames(rawGroupNames);

  if (groupNames.length === 0 || connectedClients.size === 0) {
    return;
  }

  const payload = {
    type: 'invalidate-queries',
    groupNames,
    timestamp: Date.now(),
  };

  const event = buildSseEvent('invalidate-queries', payload);

  connectedClients.forEach(({ res, heartbeatId }, clientId) => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeatId);
      connectedClients.delete(clientId);
      return;
    }

    try {
      res.write(event);
    } catch {
      clearInterval(heartbeatId);
      connectedClients.delete(clientId);
    }
  });
}
