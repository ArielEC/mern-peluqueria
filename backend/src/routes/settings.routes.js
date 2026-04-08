import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/settings - Público (para mostrar info del negocio)
router.get('/', optionalAuth, getSettings);

// PUT /api/settings - Solo Admin
router.put('/', authenticateToken, requireAdmin, updateSettings);

export default router;
