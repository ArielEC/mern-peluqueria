import { z } from 'zod';

export const registerSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),

  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('El email no es válido')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),

  telefono: z
    .string()
    .regex(/^\d{9,15}$/, 'El teléfono debe tener entre 9 y 15 dígitos')
    .optional()
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('El email no es válido')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
});

export const updateProfileSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),

  telefono: z
    .string()
    .regex(/^\d{9,15}$/, 'El teléfono debe tener entre 9 y 15 dígitos')
    .nullish()
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es obligatoria' })
    .min(1, 'La contraseña actual es obligatoria'),

  newPassword: z
    .string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .max(100, 'La nueva contraseña no puede exceder 100 caracteres')
});
