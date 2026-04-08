import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment
} from '../controllers/appointment.controller.js';
import { authenticateToken, requireAdmin, requireClienteOrAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/appointments - Usuario autenticado (cliente ve sus citas, admin ve todas)
router.get('/', authenticateToken, requireClienteOrAdmin, getAppointments);

// GET /api/appointments/:id - Usuario autenticado (dueño o admin)
router.get('/:id', authenticateToken, requireClienteOrAdmin, getAppointmentById);

// POST /api/appointments - Usuario autenticado (crear cita)
router.post('/', authenticateToken, requireClienteOrAdmin, createAppointment);

// PUT /api/appointments/:id - Solo Admin (actualizar estado, notas internas)
router.put('/:id', authenticateToken, requireAdmin, updateAppointment);

// DELETE /api/appointments/:id - Usuario autenticado (cancelar - validación de horas mínimas)
router.delete('/:id', authenticateToken, requireClienteOrAdmin, cancelAppointment);

export default router;
