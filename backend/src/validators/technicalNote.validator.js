import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, 'Debe ser un ObjectId valido');

// Validador para crear nota tecnica
export const createTechnicalNoteSchema = z.object({
  clienteId: objectIdSchema,
  titulo: z.string().max(100, 'El titulo no puede exceder 100 caracteres').optional(),
  contenido: z.string().min(1, 'El contenido es obligatorio').max(2000, 'El contenido no puede exceder 2000 caracteres'),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
}).strict();

// Validador para actualizar nota tecnica
export const updateTechnicalNoteSchema = z.object({
  titulo: z.string().max(100).optional(),
  contenido: z.string().min(1).max(2000).optional(),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
}).strict();
