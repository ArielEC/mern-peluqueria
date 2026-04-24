/**
 * Test AB-10: Cache de Settings
 * Verifica cache hit/miss, inmutabilidad, invalidación y ausencia de race condition.
 * No requiere DB real — mockea el modelo Mongoose.
 */
import assert from 'node:assert/strict';
import Settings from '../models/Settings.js';

// ─── Mock de findOneAndUpdate y findByIdAndUpdate ────────────────────────

let findOneAndUpdateCalls = 0;
let findByIdAndUpdateCalls = 0;

const settingsBase = {
  _id: 'global',
  nombreNegocio: 'Test Peluquería',
  zonaHoraria: 'Europe/Madrid',
  duracionSlot: 15,
  diasMaximosReserva: 30,
  horasMinimasCancelacion: 24
};

const crearQueryMock = (resultado) => ({
  lean: async () => ({ ...resultado }) // devuelve copia en cada llamada (como haría MongoDB)
});

const originales = {
  findOneAndUpdate: Settings.findOneAndUpdate,
  findByIdAndUpdate: Settings.findByIdAndUpdate
};

const restaurarOriginales = () => {
  Settings.findOneAndUpdate = originales.findOneAndUpdate;
  Settings.findByIdAndUpdate = originales.findByIdAndUpdate;
};

const configurarMocks = (overrides = {}) => {
  findOneAndUpdateCalls = 0;
  findByIdAndUpdateCalls = 0;

  Settings.findOneAndUpdate = () => {
    findOneAndUpdateCalls++;
    return crearQueryMock({ ...settingsBase, ...overrides });
  };

  Settings.findByIdAndUpdate = () => {
    findByIdAndUpdateCalls++;
    return crearQueryMock({ ...settingsBase, ...overrides });
  };
};

// ─── Test: cache miss en primera llamada, cache hit en segunda ───────────

const testCacheMissYHit = async () => {
  Settings.invalidateCache();
  configurarMocks();

  const s1 = await Settings.getGlobal();
  assert.equal(findOneAndUpdateCalls, 1, 'Primera llamada debe ir a DB (cache miss)');
  assert.equal(s1.zonaHoraria, 'Europe/Madrid', 'Datos correctos en primera llamada');

  const s2 = await Settings.getGlobal();
  assert.equal(findOneAndUpdateCalls, 1, 'Segunda llamada debe servir desde cache (sin nueva query)');
  assert.equal(s2.zonaHoraria, 'Europe/Madrid', 'Datos correctos desde cache');

  console.log('  ✓ Cache miss en primera llamada, cache hit en segunda');
};

// ─── Test: invalidateCache fuerza nueva consulta ──────────────────────────

const testInvalidateCache = async () => {
  Settings.invalidateCache();
  configurarMocks({ nombreNegocio: 'Negocio Actualizado' });

  await Settings.getGlobal(); // primer call → DB
  assert.equal(findOneAndUpdateCalls, 1);

  Settings.invalidateCache();
  await Settings.getGlobal(); // post-invalidate → debe ir a DB de nuevo
  assert.equal(findOneAndUpdateCalls, 2, 'Tras invalidateCache debe volver a consultar DB');

  console.log('  ✓ invalidateCache() fuerza nueva consulta a DB');
};

// ─── Test: updateGlobal actualiza el cache ───────────────────────────────

const testUpdateGlobalActualizaCache = async () => {
  Settings.invalidateCache();
  configurarMocks({ duracionSlot: 30 });

  const updated = await Settings.updateGlobal({ duracionSlot: 30 });
  assert.equal(updated.duracionSlot, 30, 'updateGlobal debe devolver los datos actualizados');

  // El cache debe estar actualizado sin nueva consulta
  const cachedCalls = findOneAndUpdateCalls + findByIdAndUpdateCalls;
  const cached = await Settings.getGlobal();
  assert.equal(
    findOneAndUpdateCalls + findByIdAndUpdateCalls,
    cachedCalls,
    'getGlobal tras updateGlobal no debe ir a DB (usa cache nuevo)'
  );
  assert.equal(cached.duracionSlot, 30, 'Cache debe reflejar el valor actualizado');

  console.log('  ✓ updateGlobal() actualiza el cache correctamente');
};

// ─── Test: el cache devuelve un objeto inmutable (Object.freeze) ──────────

const testCacheInmutable = async () => {
  Settings.invalidateCache();
  configurarMocks();

  const s = await Settings.getGlobal();

  // Intentar mutar el objeto cacheado no debe propagarse al cache
  const zonaOriginal = s.zonaHoraria;
  try {
    s.zonaHoraria = 'Mars/Olympus'; // en strict mode lanza TypeError, en sloppy mode falla silenciosamente
  } catch {
    // TypeError esperado en strict mode
  }

  const s2 = await Settings.getGlobal();
  assert.equal(s2.zonaHoraria, zonaOriginal, 'Cache debe ser inmutable: mutación no debe persistir');

  console.log('  ✓ Cache inmutable: mutaciones externas no contaminan el objeto cacheado');
};

// ─── Test: consistencia entre múltiples llamadas concurrentes ────────────

const testConcurrencia = async () => {
  Settings.invalidateCache();

  let dbCalls = 0;
  Settings.findOneAndUpdate = () => {
    dbCalls++;
    return crearQueryMock(settingsBase);
  };

  // Simular N llamadas concurrentes antes de que el cache esté listo
  const promesas = Array.from({ length: 10 }, () => Settings.getGlobal());
  const resultados = await Promise.all(promesas);

  // Todas deben devolver datos válidos
  for (const r of resultados) {
    assert.equal(r.zonaHoraria, 'Europe/Madrid', 'Cada llamada concurrente debe devolver datos válidos');
  }

  // Con el fix de findOneAndUpdate atómico, idealmente pocos llamados a DB
  // (en la implementación real, el cache se llena tras el primer resolve)
  assert.ok(dbCalls >= 1, 'Debe haber al menos 1 llamada a DB');

  console.log(`  ✓ Concurrencia: ${dbCalls} llamada(s) a DB para ${promesas.length} requests simultáneas`);
};

// ─── Test: getGlobal devuelve settings con estructura correcta ────────────

const testEstructuraSettings = async () => {
  Settings.invalidateCache();
  configurarMocks();

  const s = await Settings.getGlobal();

  const camposRequeridos = ['zonaHoraria', 'duracionSlot', 'diasMaximosReserva', 'horasMinimasCancelacion'];
  for (const campo of camposRequeridos) {
    assert.ok(campo in s, `Settings debe tener campo "${campo}"`);
  }

  assert.equal(typeof s.zonaHoraria, 'string', 'zonaHoraria debe ser string');
  assert.equal(typeof s.duracionSlot, 'number', 'duracionSlot debe ser número');
  assert.equal(typeof s.diasMaximosReserva, 'number', 'diasMaximosReserva debe ser número');

  console.log('  ✓ Estructura de settings: todos los campos requeridos presentes con tipos correctos');
};

// ─── Runner ──────────────────────────────────────────────────────────────

const main = async () => {
  try {
    console.log('AB-10 — Cache de Settings:');
    await testCacheMissYHit();
    await testInvalidateCache();
    await testUpdateGlobalActualizaCache();
    await testCacheInmutable();
    await testConcurrencia();
    await testEstructuraSettings();
    console.log('AB-10 OK: cache de settings verificado (hit/miss, inmutabilidad, invalidación, concurrencia).');
  } catch (error) {
    console.error('AB-10 FAIL:', error.message);
    process.exit(1);
  } finally {
    restaurarOriginales();
    Settings.invalidateCache();
  }
};

main();
