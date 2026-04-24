import express from 'express';
import {
  getNotesByClient,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
} from '../controllers/technicalNote.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createTechnicalNoteSchema, updateTechnicalNoteSchema } from '../validators/technicalNote.validator.js';

const router = express.Router();

// Todas las rutas de notas técnicas requieren autenticación y rol admin

// GET /api/technical-notes?clienteId=...
router.get('/', authenticateToken, requireAdmin, getNotesByClient);

// GET /api/technical-notes/:id
router.get('/:id', authenticateToken, requireAdmin, getNoteById);

// POST /api/technical-notes
router.post('/', authenticateToken, requireAdmin, validate(createTechnicalNoteSchema), createNote);

// PUT /api/technical-notes/:id
router.put('/:id', authenticateToken, requireAdmin, validate(updateTechnicalNoteSchema), updateNote);

// DELETE /api/technical-notes/:id
router.delete('/:id', authenticateToken, requireAdmin, deleteNote);

export default router;
