import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  listClients,
  updateClientStatus
} from '../controllers/auth.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateClientStatusSchema
} from '../validators/auth.validator.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' }
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

router.get('/clients', authenticateToken, requireAdmin, listClients);
router.put('/clients/:id/status', authenticateToken, requireAdmin, validate(updateClientStatusSchema), updateClientStatus);

export default router;
