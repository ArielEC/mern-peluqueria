import { z } from 'zod';

/**
 * Esquema de validación para registro de nuevos usuarios (clientes).
 */
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

/**
 * Esquema de validación para inicio de sesión.
 */
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

/**
 * Esquema de validación para actualización de perfil.
 * Todos los campos son opcionales ya que es una actualización parcial.
 */
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

/**
 * Esquema de validación para cambio de contraseña.
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es obligatoria' })
    .min(1, 'La contraseña actual es obligatoria'),
  
  newPassword: z
    .string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .max(100, 'La nueva contraseña no puede exceder 100 caracteres')
});

/**
 * Middleware factory para validar el body de la request con un esquema Zod.
 * Retorna errores formateados si la validación falla.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Errores de validación',
        details: errors
      });
    }
    
    // Reemplazar body con datos validados y transformados (trim, toLowerCase, etc.)
    req.body = result.data;
    next();
  } catch (error) {
    console.error('Error en validación:', error);
    return res.status(500).json({ 
      error: 'Error interno de validación' 
    });
  }
};
