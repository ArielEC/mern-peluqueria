import express from 'express';
import {
  getAllProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  deleteProfessional
} from '../controllers/professional.controller.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createProfessionalSchema, updateProfessionalSchema } from '../validators/professional.validator.js';

const router = express.Router();

// GET /api/professionals - Público (para reservas)
router.get('/', optionalAuth, getAllProfessionals);

// GET /api/professionals/:id - Público
router.get('/:id', optionalAuth, getProfessionalById);

// POST /api/professionals - Solo Admin
router.post('/', authenticateToken, requireAdmin, validate(createProfessionalSchema), createProfessional);

// PUT /api/professionals/:id - Solo Admin
router.put('/:id', authenticateToken, requireAdmin, validate(updateProfessionalSchema), updateProfessional);

// DELETE /api/professionals/:id - Solo Admin (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, deleteProfessional);

export default router;
