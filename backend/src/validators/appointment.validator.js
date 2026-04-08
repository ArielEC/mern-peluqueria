import { z } from 'zod';

// Validador para crear cita
export const createAppointmentSchema = z.object({
  servicioId: z.string().min(1, 'El servicio es requerido'),
  fechaHoraInicio: z.string().datetime({ message: 'Fecha y hora inválida' }).or(z.date()),
  profesionalId: z.string().optional(), // Opcional - asignación automática si no se especifica
  notasCliente: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),
  forceOverbook: z.boolean().optional() // Solo admin puede usar esto
});

// Validador para actualizar cita (admin)
export const updateAppointmentSchema = z.object({
  estado: z.enum(['confirmada', 'completada', 'cancelada', 'no_presentado']).optional(),
  notasInternas: z.string().max(1000).optional(),
  motivoCancelacion: z.string().max(500).optional()
});

// Validador para cancelar cita
export const cancelAppointmentSchema = z.object({
  motivoCancelacion: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional()
});
