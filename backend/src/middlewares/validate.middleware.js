/**
 * Middleware genérico de validación con Zod.
 *
 * Uso en rutas:
 *   router.post('/', authenticateToken, validate(createFooSchema), createFoo);
 *   router.get('/',  authenticateToken, validate(querySchema, 'query'), listFoo);
 *
 * @param {import('zod').ZodSchema} schema - Schema Zod a aplicar
 * @param {'body'|'query'|'params'} source - Fuente de datos a validar (default: 'body')
 *
 * El middleware ejecuta safeParse sobre req[source] con el schema recibido.
 * - Si la validación falla → 400 con { error, details }
 * - Si la validación pasa → req.validatedBody = datos transformados, llama next()
 *
 * Los controladores leen req.validatedBody en lugar de repetir safeParse.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: result.error.errors
    });
  }

  req.validatedBody = result.data;
  next();
};
