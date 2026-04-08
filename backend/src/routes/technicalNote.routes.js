import express from 'express';
import {
  getNotesByClient,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
} from '../controllers/technicalNote.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de notas técnicas requieren autenticación y rol admin

// GET /api/technical-notes/:clienteId
router.get('/:clienteId', authenticateToken, requireAdmin, getNotesByClient);

// GET /api/technical-notes/:clienteId/:noteId
router.get('/:clienteId/:noteId', authenticateToken, requireAdmin, getNoteById);

// POST /api/technical-notes/:clienteId
router.post('/:clienteId', authenticateToken, requireAdmin, createNote);

// PUT /api/technical-notes/:clienteId/:noteId
router.put('/:clienteId/:noteId', authenticateToken, requireAdmin, updateNote);

// DELETE /api/technical-notes/:clienteId/:noteId
router.delete('/:clienteId/:noteId', authenticateToken, requireAdmin, deleteNote);

export default router;
