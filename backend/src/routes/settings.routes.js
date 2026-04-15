import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = express.Router();

// GET /api/settings - Solo Admin
router.get('/', authenticateToken, requireAdmin, getSettings);

// PUT /api/settings - Solo Admin
router.put('/', authenticateToken, requireAdmin, validate(updateSettingsSchema), updateSettings);

export default router;
