import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  changePasswordSchema 
} from '../validations/auth.validation.js';

const router = Router();

// ============================================
// Rutas públicas (sin autenticación)
// ============================================

/**
 * POST /api/auth/register
 * Registra un nuevo cliente
 */
router.post('/register', validate(registerSchema), register);

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve token JWT
 */
router.post('/login', validate(loginSchema), login);

// ============================================
// Rutas protegidas (requieren autenticación)
// ============================================

/**
 * GET /api/auth/me
 * Obtiene el perfil del usuario autenticado
 */
router.get('/me', authenticateToken, getProfile);

/**
 * PUT /api/auth/me
 * Actualiza el perfil del usuario autenticado
 */
router.put('/me', authenticateToken, validate(updateProfileSchema), updateProfile);

/**
 * PUT /api/auth/change-password
 * Cambia la contraseña del usuario autenticado
 */
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

export default router;
