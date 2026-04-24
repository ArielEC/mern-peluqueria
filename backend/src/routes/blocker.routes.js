import express from 'express';
import {
  getAllBlockers,
  getBlockerById,
  createBlocker,
  updateBlocker,
  deleteBlocker
} from '../controllers/blocker.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loadSettings } from '../middlewares/settings.middleware.js';
import { createBlockerSchema, updateBlockerSchema } from '../validators/blocker.validator.js';

const router = express.Router();

// Todas las rutas de blockers requieren autenticación y rol admin

// GET /api/blockers — loadSettings necesario para TZ-aware date filtering
router.get('/', authenticateToken, requireAdmin, loadSettings, getAllBlockers);

// GET /api/blockers/:id
router.get('/:id', authenticateToken, requireAdmin, getBlockerById);

// POST /api/blockers
router.post('/', authenticateToken, requireAdmin, validate(createBlockerSchema), createBlocker);

// PUT /api/blockers/:id
router.put('/:id', authenticateToken, requireAdmin, validate(updateBlockerSchema), updateBlocker);

// DELETE /api/blockers/:id
router.delete('/:id', authenticateToken, requireAdmin, deleteBlocker);

export default router;
