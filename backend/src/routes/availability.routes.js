import express from 'express';
import { getAvailability } from '../controllers/availability.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/availability - Público (para reservas)
// Query: ?fecha=YYYY-MM-DD&servicioId=xxx&profesionalId=xxx (opcional)
router.get('/', optionalAuth, getAvailability);

export default router;
