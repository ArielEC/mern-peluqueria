import { Router } from 'express';
import { streamQuerySync } from '../controllers/querySync.controller.js';

const router = Router();

// GET /api/query-sync/stream - Stream SSE público con invalidaciones de cache.
router.get('/stream', streamQuerySync);

export default router;
