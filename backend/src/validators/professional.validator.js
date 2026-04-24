import { z } from 'zod';

// Esquema para horario de un día
const horarioDiaSchema = z
  .object({
    activo: z.boolean(),
    inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)').optional(),
    fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)').optional(),
    descansoInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)').optional(),
    descansoFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)').optional()
  })
  .strict()
  .refine((data) => {
    // Si está activo, debe tener inicio y fin
    if (data.activo && (!data.inicio || !data.fin)) {
      return false;
    }
    return true;
  }, { message: 'Si el día está activo, debe tener hora de inicio y fin' });

// Esquema para horario semanal
const horarioSemanalSchema = z.object({
  0: horarioDiaSchema.optional(), // Domingo
  1: horarioDiaSchema.optional(), // Lunes
  2: horarioDiaSchema.optional(), // Martes
  3: horarioDiaSchema.optional(), // Miércoles
  4: horarioDiaSchema.optional(), // Jueves
  5: horarioDiaSchema.optional(), // Viernes
  6: horarioDiaSchema.optional()  // Sábado
}).strict();

// Validador para crear profesional
export const createProfessionalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  especialidad: z.string().min(1, 'La especialidad es obligatoria').max(100, 'La especialidad no puede exceder 100 caracteres'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal inválido').optional(),
  activo: z.boolean().optional(),
  horarioSemanal: horarioSemanalSchema.optional()
}).strict();

// Validador para actualizar profesional
export const updateProfessionalSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  especialidad: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal inválido').optional(),
  activo: z.boolean().optional(),
  horarioSemanal: horarioSemanalSchema.optional()
}).strict();
