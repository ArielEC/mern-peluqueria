/**
 * Test AB-08: Timezone / fechas
 * Verifica que las utilidades de dateTime.js manejan correctamente la TZ del negocio
 * y que el validador de zonaHoraria acepta solo valores IANA válidos.
 * No requiere conexión a DB.
 */
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import {
  parseFechaLocal,
  parsearFiltroFecha,
  getDiaSemana,
  construirFechaEnTZ,
  getMinutosDesdeMedianoche,
  getInicioDelDiaHoy,
  esMismoDia,
  TIMEZONE_DEFAULT
} from '../utils/dateTime.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// ─── Tests de parseFechaLocal ─────────────────────────────────────────────

const testParseFechaLocal = () => {
  const tz = 'Europe/Madrid';
  const fecha = parseFechaLocal('2025-06-15', tz);
  assert.ok(fecha instanceof Date, 'parseFechaLocal debe devolver un Date');
  assert.ok(!Number.isNaN(fecha.getTime()), 'parseFechaLocal no debe producir NaN');

  // En Europe/Madrid (UTC+2 en verano), medianoche local = 22:00 UTC del día anterior
  const horaUTC = fecha.getUTCHours();
  assert.ok(horaUTC === 22 || horaUTC === 23, `Medianoche en Europe/Madrid debe ser 22:00 o 23:00 UTC (got ${horaUTC})`);

  // Mismo día en UTC+0 vs UTC-5 — el día de semana debe ser correcto en la TZ del negocio
  const diaSemana = getDiaSemana(fecha, tz);
  assert.ok(diaSemana >= 0 && diaSemana <= 6, `getDiaSemana debe devolver 0-6 (got ${diaSemana})`);

  console.log('  ✓ parseFechaLocal: medianoche correcta en TZ del negocio');
};

// ─── Tests de parsearFiltroFecha ─────────────────────────────────────────────

const testParsearFiltroFecha = () => {
  const tz = 'Europe/Madrid';

  // Fecha simple — inicio del día
  const inicio = parsearFiltroFecha('2025-06-15', false, tz);
  assert.ok(inicio instanceof Date, 'inicio debe ser Date');
  const inicioUTC = inicio.toISOString();
  // Debe ser medianoche (00:00:00) en Madrid → 22:00 UTC en verano o 23:00 en invierno
  assert.ok(inicioUTC.includes('T22:00:00') || inicioUTC.includes('T23:00:00'),
    `inicio del día en Madrid debe ser 22:00 o 23:00 UTC (got ${inicioUTC})`);

  // Fecha simple — fin del día
  const fin = parsearFiltroFecha('2025-06-15', true, tz);
  assert.ok(fin instanceof Date, 'fin debe ser Date');
  assert.ok(fin > inicio, 'fin del día debe ser posterior a inicio del día');

  // ISO datetime con offset — parseo directo
  const isoFecha = parsearFiltroFecha('2025-06-15T10:30:00+02:00', false, tz);
  assert.ok(isoFecha instanceof Date, 'ISO con offset debe parsear correctamente');
  assert.equal(isoFecha.getUTCHours(), 8, 'ISO con +02:00 debe convertir a 08:00 UTC');

  // Valor inválido
  const invalido = parsearFiltroFecha('no-es-fecha', false, tz);
  assert.equal(invalido, null, 'String inválido debe devolver null');

  // Tipo no string
  assert.equal(parsearFiltroFecha(null, false, tz), null, 'null debe devolver null');
  assert.equal(parsearFiltroFecha(12345, false, tz), null, 'número debe devolver null');

  console.log('  ✓ parsearFiltroFecha: inicio/fin de día en TZ del negocio correctos');
};

// ─── Tests de construirFechaEnTZ y getMinutosDesdeMedianoche ─────────────

const testConstruirFechaEnTZ = () => {
  const tz = 'Europe/Madrid';
  const fechaBase = parseFechaLocal('2025-06-15', tz);

  const fecha1030 = construirFechaEnTZ(fechaBase, 630, tz); // 10h*60 + 30 = 630 min
  const minutos = getMinutosDesdeMedianoche(fecha1030, tz);

  assert.equal(minutos, 630, `getMinutosDesdeMedianoche debe devolver 630 (got ${minutos})`);
  console.log('  ✓ construirFechaEnTZ + getMinutosDesdeMedianoche: round-trip correcto');
};

// ─── Tests de esMismoDia ─────────────────────────────────────────────────

const testEsMismoDia = () => {
  const tz = 'Europe/Madrid';
  const a = parseFechaLocal('2025-06-15', tz);
  const b = new Date(a.getTime() + 12 * 3600 * 1000); // 12h después

  assert.equal(esMismoDia(a, b, tz), true, 'Mismo día debe ser true');

  const c = new Date(a.getTime() + 25 * 3600 * 1000); // 25h después → día siguiente
  assert.equal(esMismoDia(a, c, tz), false, 'Día distinto debe ser false');

  console.log('  ✓ esMismoDia: comparación en TZ del negocio correcta');
};

// ─── Tests de validación IANA en settings.validator (C1) ─────────────────

const testIANAValidation = () => {
  // Zonas IANA válidas
  const casosValidos = ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo', 'UTC', 'Europe/London'];
  for (const tz of casosValidos) {
    const result = updateSettingsSchema.safeParse({ zonaHoraria: tz });
    assert.ok(result.success, `zonaHoraria "${tz}" debe ser válida (error: ${JSON.stringify(result.error?.errors)})`);
  }

  // Zonas inválidas
  const casosInvalidos = ['Mars/Olympus', 'InvalidZone', 'Europe/Invalid', 'foo/bar'];
  for (const tz of casosInvalidos) {
    const result = updateSettingsSchema.safeParse({ zonaHoraria: tz });
    assert.ok(!result.success, `zonaHoraria "${tz}" debe ser inválida`);
    const errorMsg = result.error?.errors[0]?.message || '';
    assert.ok(errorMsg.includes('IANA') || errorMsg.includes('zona'), `Error debe mencionar IANA (got: ${errorMsg})`);
  }

  // Sin zonaHoraria (campo opcional)
  const sinTZ = updateSettingsSchema.safeParse({ nombreNegocio: 'Test' });
  assert.ok(sinTZ.success, 'Settings sin zonaHoraria debe ser válido (campo opcional)');

  console.log('  ✓ Validación IANA: acepta válidas, rechaza inválidas correctamente');
};

// ─── Tests de TIMEZONE_DEFAULT exportado ────────────────────────────────

const testTimezoneDefault = () => {
  assert.equal(typeof TIMEZONE_DEFAULT, 'string', 'TIMEZONE_DEFAULT debe ser string');
  assert.ok(TIMEZONE_DEFAULT.length > 0, 'TIMEZONE_DEFAULT no debe estar vacío');
  // Verificar que es una zona válida
  try {
    Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE_DEFAULT });
  } catch {
    assert.fail(`TIMEZONE_DEFAULT "${TIMEZONE_DEFAULT}" no es una zona IANA válida`);
  }
  console.log(`  ✓ TIMEZONE_DEFAULT: "${TIMEZONE_DEFAULT}" es IANA válida y está exportada`);
};

// ─── Runner ──────────────────────────────────────────────────────────────

const main = () => {
  try {
    console.log('AB-08 — Timezone / fechas:');
    testTimezoneDefault();
    testParseFechaLocal();
    testParsearFiltroFecha();
    testConstruirFechaEnTZ();
    testEsMismoDia();
    testIANAValidation();
    console.log('AB-08 OK: todas las verificaciones de timezone superadas.');
  } catch (error) {
    console.error('AB-08 FAIL:', error.message);
    process.exit(1);
  }
};

main();
