/**
 * Test AB-09: Middleware de validación
 * Verifica que validate(schema) y validate(schema, source) funcionan correctamente.
 * No requiere conexión a DB — usa mocks de req/res.
 */
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';

// ─── Helpers de mock ────────────────────────────────────────────────────

const crearReq = (body = {}, query = {}, params = {}) => ({ body, query, params });

const crearRes = () => {
  const res = {
    _status: null,
    _json: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._json = data;
      return this;
    }
  };
  return res;
};

// ─── Tests de validate(schema) — source 'body' por defecto ──────────────

const testBodyValido = () => {
  const schema = z.object({ nombre: z.string().min(1) }).strict();
  const req = crearReq({ nombre: 'Test' });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema)(req, res, () => { nextLlamado = true; });

  assert.ok(nextLlamado, 'next() debe llamarse con body válido');
  assert.deepEqual(req.validatedBody, { nombre: 'Test' }, 'req.validatedBody debe contener los datos parseados');
  assert.equal(res._status, null, 'No debe responder con error');
  console.log('  ✓ validate(schema): body válido → next() y req.validatedBody asignado');
};

const testBodyInvalido = () => {
  const schema = z.object({ nombre: z.string().min(1) }).strict();
  const req = crearReq({ nombre: '' }); // min(1) fallará
  const res = crearRes();
  let nextLlamado = false;

  validate(schema)(req, res, () => { nextLlamado = true; });

  assert.ok(!nextLlamado, 'next() NO debe llamarse con body inválido');
  assert.equal(res._status, 400, 'Debe responder con 400');
  assert.equal(res._json?.error, 'Datos inválidos', 'Mensaje de error correcto');
  assert.ok(Array.isArray(res._json?.details), 'details debe ser array de errores Zod');
  console.log('  ✓ validate(schema): body inválido → 400 con details');
};

const testBodyCamposExtraRechazados = () => {
  const schema = z.object({ nombre: z.string() }).strict();
  const req = crearReq({ nombre: 'Test', campoExtra: 'inyectado' });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema)(req, res, () => { nextLlamado = true; });

  assert.ok(!nextLlamado, 'next() NO debe llamarse con campos extra en schema strict');
  assert.equal(res._status, 400, 'Debe responder con 400 por campo no permitido');
  console.log('  ✓ validate(schema): campos extra rechazados por .strict()');
};

const testBodyConTransformaciones = () => {
  const schema = z.object({
    precio: z.string().transform(Number),
    activo: z.boolean()
  });
  const req = crearReq({ precio: '25', activo: true });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema)(req, res, () => { nextLlamado = true; });

  assert.ok(nextLlamado, 'next() debe llamarse');
  assert.equal(typeof req.validatedBody.precio, 'number', 'Transformación string→number debe aplicarse');
  assert.equal(req.validatedBody.precio, 25, 'Valor transformado debe ser 25');
  console.log('  ✓ validate(schema): transformaciones Zod aplicadas en validatedBody');
};

// ─── Tests de validate(schema, 'query') ─────────────────────────────────

const testQueryValida = () => {
  const schema = z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    limit: z.string().transform(Number).optional()
  });
  const req = crearReq({}, { fecha: '2025-06-15', limit: '10' });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema, 'query')(req, res, () => { nextLlamado = true; });

  assert.ok(nextLlamado, 'next() debe llamarse con query válida');
  assert.equal(req.validatedBody.fecha, '2025-06-15', 'fecha de query en validatedBody');
  assert.equal(req.validatedBody.limit, 10, 'limit transformado a número');
  console.log('  ✓ validate(schema, "query"): query params validados y en req.validatedBody');
};

const testQueryInvalida = () => {
  const schema = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
  const req = crearReq({}, { fecha: 'no-es-fecha' });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema, 'query')(req, res, () => { nextLlamado = true; });

  assert.ok(!nextLlamado, 'next() NO debe llamarse con query inválida');
  assert.equal(res._status, 400, 'Debe responder con 400');
  console.log('  ✓ validate(schema, "query"): query inválida → 400');
};

// ─── Tests de validate(schema, 'params') ────────────────────────────────

const testParamsValidos = () => {
  const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
  const schema = z.object({ id: z.string().regex(OBJECT_ID_REGEX) });
  const req = crearReq({}, {}, { id: '507f1f77bcf86cd799439011' });
  const res = crearRes();
  let nextLlamado = false;

  validate(schema, 'params')(req, res, () => { nextLlamado = true; });

  assert.ok(nextLlamado, 'next() debe llamarse con params válidos');
  assert.equal(req.validatedBody.id, '507f1f77bcf86cd799439011', 'id en validatedBody');
  console.log('  ✓ validate(schema, "params"): path params validados correctamente');
};

// ─── Tests del contrato de error ─────────────────────────────────────────

const testFormatoError = () => {
  const schema = z.object({ email: z.string().email(), edad: z.number().min(0) });
  const req = crearReq({ email: 'no-valido', edad: -1 });
  const res = crearRes();

  validate(schema)(req, res, () => {});

  assert.equal(res._status, 400);
  assert.ok(res._json.error, 'Debe tener campo error');
  assert.ok(Array.isArray(res._json.details), 'Debe tener campo details como array');
  assert.ok(res._json.details.length >= 2, 'Debe reportar múltiples errores');

  // Verificar estructura de cada error Zod
  for (const detail of res._json.details) {
    assert.ok(detail.path, 'Cada error debe tener path');
    assert.ok(detail.message, 'Cada error debe tener message');
  }
  console.log('  ✓ Contrato de error: { error, details[] } con múltiples errores Zod');
};

// ─── Runner ──────────────────────────────────────────────────────────────

const main = () => {
  try {
    console.log('AB-09 — Middleware de validación:');
    testBodyValido();
    testBodyInvalido();
    testBodyCamposExtraRechazados();
    testBodyConTransformaciones();
    testQueryValida();
    testQueryInvalida();
    testParamsValidos();
    testFormatoError();
    console.log('AB-09 OK: middleware validate() verificado para body, query y params.');
  } catch (error) {
    console.error('AB-09 FAIL:', error.message);
    process.exit(1);
  }
};

main();
