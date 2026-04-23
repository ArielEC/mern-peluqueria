/**
 * Script de migración para corregir caracteres rotos (mojibake) en MongoDB.
 *
 * Problema: datos guardados con encoding incorrecto (latin1 → UTF-8 doble encoding).
 * Ejemplo: "Coloración" → "ColoraciÃ³n", "García" → "GarcÃ­a"
 *
 * Uso:
 *   node --experimental-modules src/scripts/fix-encoding.js
 *
 * El script es idempotente: si los datos ya son correctos, no los modifica.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/peluqueria';

// Mapa de secuencias mojibake comunes (UTF-8 interpretado como latin1)
const MOJIBAKE_MAP = [
  // Vocales con tilde
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
  ['Ã\x81', 'Á'], ['Ã\x89', 'É'], ['Ã\x8D', 'Í'], ['Ã\x93', 'Ó'], ['Ã\x9A', 'Ú'],
  // Eñe
  ['Ã±', 'ñ'], ['Ã\x91', 'Ñ'],
  // Diéresis
  ['Ã¼', 'ü'], ['Ã\x9C', 'Ü'],
  // Otros comunes
  ['Â·', '·'], ['Â¿', '¿'], ['Â¡', '¡'],
  ['â\x80\x93', '\u2013'], ['â\x80\x94', '\u2014'], ['â\x80\x99', '\u2019'], ['â\x80\x9C', '\u201C'], ['â\x80\x9D', '\u201D'],
  // Espacios rotos (byte 0xC2 0xA0 → espacio no-break interpretado mal)
  ['Â\xA0', ' '], ['Â ', ' '],
];

// Regex que detecta si un string tiene mojibake
const MOJIBAKE_REGEX = /Ã[¡é­³ºÁÉÍÓÚ±Ñ¼Ü]|Â[·¿¡ ]|â\x80/;

function fixMojibake(str) {
  if (typeof str !== 'string') return str;
  let fixed = str;
  for (const [bad, good] of MOJIBAKE_MAP) {
    fixed = fixed.split(bad).join(good);
  }
  // También corregir "Garc a" → esto podría ser un byte nulo o carácter perdido
  // Patrón: letra mayúscula + espacio + letra minúscula donde debería haber tilde
  // No podemos corregir esto automáticamente sin diccionario, pero sí limpiar bytes nulos
  fixed = fixed.replace(/\x00/g, '');
  return fixed;
}

function hasMojibake(str) {
  if (typeof str !== 'string') return false;
  return MOJIBAKE_REGEX.test(str);
}

function fixObjectStrings(obj) {
  if (typeof obj === 'string') return fixMojibake(obj);
  if (Array.isArray(obj)) return obj.map(fixObjectStrings);
  if (obj && typeof obj === 'object') {
    const fixed = {};
    for (const [key, value] of Object.entries(obj)) {
      fixed[key] = fixObjectStrings(value);
    }
    return fixed;
  }
  return obj;
}

async function fixCollection(db, collectionName, fields) {
  const collection = db.collection(collectionName);
  const cursor = collection.find({});
  let fixedCount = 0;
  let totalChecked = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    totalChecked++;
    const updates = {};
    let needsFix = false;

    for (const field of fields) {
      const value = doc[field];
      if (typeof value === 'string' && hasMojibake(value)) {
        updates[field] = fixMojibake(value);
        needsFix = true;
      }
    }

    if (needsFix) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      fixedCount++;
      console.log(`  ✓ ${collectionName} [${doc._id}]:`, Object.entries(updates).map(([k, v]) => `${k}="${v}"`).join(', '));
    }
  }

  console.log(`  ${collectionName}: ${totalChecked} docs revisados, ${fixedCount} corregidos`);
  return fixedCount;
}

async function main() {
  console.log('=== Migración de encoding — Fix Mojibake ===\n');
  console.log(`Conectando a: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  let totalFixed = 0;

  // Servicios: nombre, descripcion, categoria
  console.log('Revisando servicios...');
  totalFixed += await fixCollection(db, 'services', ['nombre', 'descripcion', 'categoria']);

  // Profesionales: nombre, especialidad
  console.log('Revisando profesionales...');
  totalFixed += await fixCollection(db, 'professionals', ['nombre', 'especialidad']);

  // Usuarios (clientes): nombre
  console.log('Revisando usuarios...');
  totalFixed += await fixCollection(db, 'users', ['nombre']);

  // Citas: notasCliente, notasInternas, motivoCancelacion
  console.log('Revisando citas...');
  totalFixed += await fixCollection(db, 'appointments', ['notasCliente', 'notasInternas', 'motivoCancelacion']);

  // Settings: nombreNegocio, direccion, mensajeBienvenida, politicaCancelacion
  console.log('Revisando settings...');
  totalFixed += await fixCollection(db, 'settings', ['nombreNegocio', 'direccion', 'mensajeBienvenida', 'politicaCancelacion']);

  // Bloqueos: motivo
  console.log('Revisando bloqueos...');
  totalFixed += await fixCollection(db, 'blockers', ['motivo']);

  // Notas técnicas: contenido, titulo
  console.log('Revisando notas técnicas...');
  totalFixed += await fixCollection(db, 'technicalnotes', ['contenido', 'titulo']);

  console.log(`\n=== Resultado: ${totalFixed} documentos corregidos ===`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
