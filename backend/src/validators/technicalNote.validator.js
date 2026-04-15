import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, 'Debe ser un ObjectId válido');

// Validador para crear nota técnica
export const createTechnicalNoteSchema = z.object({
  clienteId: objectIdSchema,
  cita: objectIdSchema.optional(), // ObjectId válido
  creadaPor: objectIdSchema.optional(), // ObjectId del profesional
  titulo: z.string().max(100, 'El título no puede exceder 100 caracteres').optional(),
  contenido: z.string().min(1, 'El contenido es obligatorio').max(2000, 'El contenido no puede exceder 2000 caracteres'),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
}).strict();

// Validador para actualizar nota técnica
export const updateTechnicalNoteSchema = z.object({
  cita: objectIdSchema.optional(),
  creadaPor: objectIdSchema.optional(),
  titulo: z.string().max(100).optional(),
  contenido: z.string().min(1).max(2000).optional(),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
}).strict();
