import express from 'express';
import {
  getAllBlockers,
  getBlockerById,
  createBlocker,
  updateBlocker,
  deleteBlocker
} from '../controllers/blocker.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de blockers requieren autenticación y rol admin

// GET /api/blockers
router.get('/', authenticateToken, requireAdmin, getAllBlockers);

// GET /api/blockers/:id
router.get('/:id', authenticateToken, requireAdmin, getBlockerById);

// POST /api/blockers
router.post('/', authenticateToken, requireAdmin, createBlocker);

// PUT /api/blockers/:id
router.put('/:id', authenticateToken, requireAdmin, updateBlocker);

// DELETE /api/blockers/:id
router.delete('/:id', authenticateToken, requireAdmin, deleteBlocker);

export default router;
