import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, 'Debe ser un ObjectId válido');

// Validador para crear blocker
export const createBlockerSchema = z
  .object({
    profesional: objectIdSchema.optional().nullable(), // ObjectId o null para bloqueo global
    titulo: z.string().min(1, 'El título es obligatorio').max(100, 'El título no puede exceder 100 caracteres'),
    descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
    fechaHoraInicio: z.string().datetime({ message: 'Fecha de inicio inválida' }).or(z.date()),
    fechaHoraFin: z.string().datetime({ message: 'Fecha de fin inválida' }).or(z.date()),
    tipo: z.enum(['vacaciones', 'festivo', 'personal', 'mantenimiento', 'otro']).optional(),
    esRecurrente: z.boolean().optional()
  })
  .strict()
  .refine((data) => {
    const inicio = new Date(data.fechaHoraInicio);
    const fin = new Date(data.fechaHoraFin);
    return fin > inicio;
  }, { message: 'La fecha de fin debe ser posterior a la fecha de inicio' });

// Validador para actualizar blocker
export const updateBlockerSchema = z.object({
  profesional: objectIdSchema.optional().nullable(),
  titulo: z.string().min(1).max(100).optional(),
  descripcion: z.string().max(500).optional(),
  fechaHoraInicio: z.string().datetime().or(z.date()).optional(),
  fechaHoraFin: z.string().datetime().or(z.date()).optional(),
  tipo: z.enum(['vacaciones', 'festivo', 'personal', 'mantenimiento', 'otro']).optional(),
  esRecurrente: z.boolean().optional()
}).strict().refine((data) => {
  if (data.fechaHoraInicio && data.fechaHoraFin) {
    return new Date(data.fechaHoraFin) > new Date(data.fechaHoraInicio);
  }
  return true;
}, { message: 'La fecha de fin debe ser posterior a la fecha de inicio' });
