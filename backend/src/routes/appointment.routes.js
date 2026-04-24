import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment
} from '../controllers/appointment.controller.js';
import { authenticateToken, requireAdmin, requireClienteOrAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loadSettings } from '../middlewares/settings.middleware.js';
import { createAppointmentSchema, updateAppointmentSchema, cancelAppointmentSchema } from '../validators/appointment.validator.js';

const router = express.Router();

// GET /api/appointments - Usuario autenticado (cliente ve sus citas, admin ve todas)
// loadSettings necesario para parsear filtros desde/hasta en la TZ del negocio
router.get('/', authenticateToken, requireClienteOrAdmin, loadSettings, getAppointments);

// GET /api/appointments/:id - Usuario autenticado (dueño o admin)
router.get('/:id', authenticateToken, requireClienteOrAdmin, getAppointmentById);

// POST /api/appointments - Usuario autenticado (crear cita)
router.post('/', authenticateToken, requireClienteOrAdmin, loadSettings, validate(createAppointmentSchema), createAppointment);

// PUT /api/appointments/:id - Solo Admin (actualizar estado, notas internas)
router.put('/:id', authenticateToken, requireAdmin, validate(updateAppointmentSchema), updateAppointment);

// DELETE /api/appointments/:id - Usuario autenticado (cancelar - validación de horas mínimas)
router.delete('/:id', authenticateToken, requireClienteOrAdmin, loadSettings, validate(cancelAppointmentSchema), cancelAppointment);

export default router;
