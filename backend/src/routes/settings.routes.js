import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/settings - Solo Admin
router.get('/', authenticateToken, requireAdmin, getSettings);

// PUT /api/settings - Solo Admin
router.put('/', authenticateToken, requireAdmin, updateSettings);

export default router;
