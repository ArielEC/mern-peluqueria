import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  listClients
} from '../controllers/auth.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/auth.validator.js';

const router = Router();

// Rate limiter específico para endpoints de autenticación (más estricto que el global)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' }
});

// ============================================
// Rutas públicas (sin autenticación)
// ============================================

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// ============================================
// Rutas protegidas (requieren autenticación)
// ============================================

// GET /api/auth/me
router.get('/me', authenticateToken, getProfile);

// PUT /api/auth/me
router.put('/me', authenticateToken, validate(updateProfileSchema), updateProfile);

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

// GET /api/auth/clients — Solo Admin
router.get('/clients', authenticateToken, requireAdmin, listClients);

export default router;
