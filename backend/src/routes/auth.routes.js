import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/auth.validator.js';

const router = Router();

// ============================================
// Rutas públicas (sin autenticación)
// ============================================

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// ============================================
// Rutas protegidas (requieren autenticación)
// ============================================

// GET /api/auth/me
router.get('/me', authenticateToken, getProfile);

// PUT /api/auth/me
router.put('/me', authenticateToken, validate(updateProfileSchema), updateProfile);

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

export default router;
