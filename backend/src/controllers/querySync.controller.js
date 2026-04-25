import { registerQuerySyncClient } from '../services/querySync.service.js';

export const streamQuerySync = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const unregister = registerQuerySyncClient(res);

  req.on('close', unregister);
  req.on('end', unregister);
};
