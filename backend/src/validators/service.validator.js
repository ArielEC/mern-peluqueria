import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, 'Debe ser un ObjectId válido');

// Validador para crear servicio
export const createServiceSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  duracion: z.number()
    .int('La duración debe ser un número entero')
    .min(15, 'La duración mínima es 15 minutos'),
  precio: z.number().min(0, 'El precio no puede ser negativo'),
  categoria: z.string().max(50).optional(),
  profesionalesCapaces: z.array(objectIdSchema).optional(), // Array de ObjectIds válidos
  activo: z.boolean().optional(),
  orden: z.number().optional()
}).strict();

// Validador para actualizar servicio
export const updateServiceSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().max(500).optional(),
  duracion: z.number()
    .int('La duración debe ser un número entero')
    .min(15)
    .optional(),
  precio: z.number().min(0).optional(),
  categoria: z.string().max(50).optional(),
  profesionalesCapaces: z.array(objectIdSchema).optional(),
  activo: z.boolean().optional(),
  orden: z.number().optional()
}).strict();
