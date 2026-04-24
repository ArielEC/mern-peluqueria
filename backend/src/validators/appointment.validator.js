import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, 'Debe ser un ObjectId válido');

// Validador para crear cita
export const createAppointmentSchema = z.object({
  servicioId: objectIdSchema,
  // offset: true permite "2026-04-17T10:00:00+02:00" además de "...Z"
  fechaHoraInicio: z.string().datetime({ message: 'Fecha y hora inválida', offset: true }).or(z.date()),
  clienteId: objectIdSchema.optional(), // Solo admin puede usar esto
  profesionalId: objectIdSchema.optional(), // Opcional - asignación automática si no se especifica
  notasCliente: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),
  forceOverbook: z.boolean().optional() // Solo admin puede usar esto
}).strict();

// Validador para actualizar cita (admin)
export const updateAppointmentSchema = z.object({
  estado: z.enum(['confirmada', 'completada', 'cancelada', 'no_presentado']).optional(),
  notasInternas: z.string().max(1000).optional(),
  motivoCancelacion: z.string().max(500).optional()
}).strict();

// Validador para cancelar cita
export const cancelAppointmentSchema = z.object({
  motivoCancelacion: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional()
}).strict();
