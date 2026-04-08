import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/service.controller.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/services - Público (para reservas)
router.get('/', optionalAuth, getAllServices);

// GET /api/services/:id - Público
router.get('/:id', optionalAuth, getServiceById);

// POST /api/services - Solo Admin
router.post('/', authenticateToken, requireAdmin, createService);

// PUT /api/services/:id - Solo Admin
router.put('/:id', authenticateToken, requireAdmin, updateService);

// DELETE /api/services/:id - Solo Admin (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, deleteService);

export default router;
