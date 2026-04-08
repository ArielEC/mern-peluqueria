import { z } from 'zod';

// Validador para actualizar settings
export const updateSettingsSchema = z.object({
  nombreNegocio: z.string().max(100, 'El nombre no puede exceder 100 caracteres').optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().max(200, 'La dirección no puede exceder 200 caracteres').optional(),
  horasMinimasCancelacion: z.number().min(0, 'Las horas mínimas no pueden ser negativas').optional(),
  diasMaximosReserva: z.number().min(1).max(365).optional(),
  duracionSlot: z.enum(['15', '30']).transform(Number).optional().or(z.number().refine(v => v === 15 || v === 30)),
  mensajeBienvenida: z.string().max(500).optional(),
  politicaCancelacion: z.string().max(1000).optional(),
  notificaciones: z.object({
    emailConfirmacion: z.boolean().optional(),
    emailRecordatorio: z.boolean().optional(),
    horasAntesRecordatorio: z.number().min(1).optional()
  }).optional()
});
