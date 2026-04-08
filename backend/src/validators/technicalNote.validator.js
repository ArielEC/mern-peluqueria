import { z } from 'zod';

// Validador para crear nota técnica
export const createTechnicalNoteSchema = z.object({
  cita: z.string().optional(), // ObjectId como string
  creadaPor: z.string().optional(), // ObjectId del profesional
  titulo: z.string().max(100, 'El título no puede exceder 100 caracteres').optional(),
  contenido: z.string().min(1, 'El contenido es obligatorio').max(2000, 'El contenido no puede exceder 2000 caracteres'),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
});

// Validador para actualizar nota técnica
export const updateTechnicalNoteSchema = z.object({
  titulo: z.string().max(100).optional(),
  contenido: z.string().min(1).max(2000).optional(),
  categoria: z.enum(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']).optional(),
  importante: z.boolean().optional()
});
