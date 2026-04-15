/**
 * Middleware genérico de validación con Zod.
 *
 * Uso en rutas:
 *   router.post('/', authenticateToken, validate(createFooSchema), createFoo);
 *
 * El middleware ejecuta safeParse sobre req.body con el schema recibido.
 * - Si la validación falla → 400 con { error, details }
 * - Si la validación pasa → req.validatedBody = datos transformados, llama next()
 *
 * Los controladores leen req.validatedBody en lugar de repetir safeParse.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: result.error.errors
    });
  }

  req.validatedBody = result.data;
  next();
};
