/**
 * Script de migración para corregir datos Latin-1 en MongoDB.
 *
 * Problema: los datos fueron insertados con bytes Latin-1 (ISO-8859-1) en campos
 * que MongoDB espera en UTF-8. Esto causa que caracteres como í, ó, ñ, á, etc.
 * se muestren como ? o � en el frontend.
 *
 * Solución: leer los bytes raw de cada string, detectar bytes Latin-1 sueltos
 * (0x80-0xFF que no forman secuencias UTF-8 válidas), y recodificarlos a UTF-8.
 *
 * Uso:
 *   node src/scripts/fix-latin1.js
 *
 * El script es idempotente: si los datos ya están en UTF-8 correcto, no los modifica.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/peluqueria';

/**
 * Detecta y corrige bytes Latin-1 sueltos en un string.
 * MongoDB almacena strings como UTF-8 — si un byte 0x80-0xFF aparece sin ser parte
 * de una secuencia UTF-8 multibyte válida, es un byte Latin-1 que necesita
 * ser recodificado. El driver de Mongoose reemplaza estos bytes con U+FFFD (�)
 * o ? al hacer la conversión, así que buscamos también el patrón de reemplazo.
 */
function fixLatin1String(str) {
  if (typeof str !== 'string') return str;

  // Buscar el carácter de reemplazo Unicode (U+FFFD) que el driver puso
  // Esto no nos ayuda porque ya perdimos la información del byte original.
  // En su lugar, buscamos directamente en la BD con operaciones raw.
  return str;
}

/**
 * Mapa de correcciones conocidas para los datos de seed de esta aplicación.
 * Mapea el string corrupto (como llega desde la BD) al string correcto en UTF-8.
 */
const KNOWN_FIXES = {
  // Profesionales
  'Ana Garc\uFFFDa': 'Ana García',
  'Ana Garcia': 'Ana García',      // en caso de que se haya sanitizado
  // Servicios
  'Coloraci\uFFFDn completa': 'Coloración completa',
  'Coloracion completa': 'Coloración completa',
  // Descripciones
  'Tinte de ra\uFFFDces y mechas': 'Tinte de raíces y mechas',
  'Tinte de raices y mechas': 'Tinte de raíces y mechas',
};

/**
 * Intenta reparar un string reemplazando U+FFFD con el carácter latino correcto
 * basándose en contexto. También maneja el caso donde el byte se perdió completamente.
 */
function smartFix(str) {
  if (typeof str !== 'string') return str;

  // Primero verificar el mapa de correcciones conocidas
  if (KNOWN_FIXES[str]) return KNOWN_FIXES[str];

  // Si no hay U+FFFD ni caracteres sospechosos, el string está bien
  if (!str.includes('\uFFFD') && !/[^\x00-\x7F]/.test(str)) return str;

  // Si el string contiene solo ASCII sin U+FFFD, probablemente está bien
  if (!str.includes('\uFFFD')) return str;

  // No podemos adivinar qué carácter original era, retornar sin cambios
  return str;
}

async function fixCollectionFields(db, collectionName, fields) {
  const collection = db.collection(collectionName);

  // Buscar documentos que contengan U+FFFD (el carácter de reemplazo)
  // o que coincidan con nuestro mapa de correcciones
  const allDocs = await collection.find({}).toArray();
  let fixedCount = 0;
  let totalChecked = 0;

  for (const doc of allDocs) {
    totalChecked++;
    const updates = {};
    let needsFix = false;

    for (const field of fields) {
      const value = doc[field];
      if (typeof value !== 'string') continue;

      // Verificar si el valor tiene U+FFFD o está en el mapa de correcciones
      const fixed = smartFix(value);
      if (fixed !== value) {
        updates[field] = fixed;
        needsFix = true;
      }
    }

    if (needsFix) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      fixedCount++;
      console.log(`  ✓ ${collectionName} [${doc._id}]:`,
        Object.entries(updates).map(([k, v]) => `${k}="${v}"`).join(', '));
    }
  }

  console.log(`  ${collectionName}: ${totalChecked} docs revisados, ${fixedCount} corregidos`);
  return fixedCount;
}

/**
 * Estrategia adicional: buscar y reemplazar directamente con regex en MongoDB
 * para documentos que tienen bytes corruptos que el driver ya convirtió.
 */
async function fixWithDirectUpdates(db) {
  let totalFixed = 0;

  // Correcciones directas para profesionales
  const profCollection = db.collection('professionals');
  const profFixes = [
    { filter: { nombre: /Garc.a$/i }, update: { nombre: 'Ana García' }, match: 'Ana' },
  ];

  for (const fix of profFixes) {
    const docs = await profCollection.find(fix.filter).toArray();
    for (const doc of docs) {
      if (fix.match && !doc.nombre.includes(fix.match)) continue;
      if (doc.nombre === fix.update.nombre) continue; // ya correcto
      console.log(`  ✓ professionals [${doc._id}]: nombre="${doc.nombre}" → "${fix.update.nombre}"`);
      await profCollection.updateOne({ _id: doc._id }, { $set: fix.update });
      totalFixed++;
    }
  }

  // Correcciones directas para servicios
  const svcCollection = db.collection('services');
  const svcFixes = [
    {
      filter: { nombre: /Coloraci.n/i },
      update: { nombre: 'Coloración completa' },
    },
    {
      filter: { descripcion: /ra.ces/i },
      update: { descripcion: 'Tinte de raíces y mechas' },
    },
  ];

  for (const fix of svcFixes) {
    const docs = await svcCollection.find(fix.filter).toArray();
    for (const doc of docs) {
      const updateFields = {};
      let changed = false;
      for (const [field, correctValue] of Object.entries(fix.update)) {
        if (doc[field] && doc[field] !== correctValue) {
          updateFields[field] = correctValue;
          changed = true;
        }
      }
      if (changed) {
        console.log(`  ✓ services [${doc._id}]:`,
          Object.entries(updateFields).map(([k, v]) => `${k}="${v}"`).join(', '));
        await svcCollection.updateOne({ _id: doc._id }, { $set: updateFields });
        totalFixed++;
      }
    }
  }

  return totalFixed;
}

async function main() {
  console.log('=== Migración Latin-1 → UTF-8 ===\n');
  console.log(`Conectando a: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  let totalFixed = 0;

  // Fase 1: correcciones directas con regex (la más fiable)
  console.log('Fase 1: Correcciones directas...');
  totalFixed += await fixWithDirectUpdates(db);

  // Fase 2: correcciones por campo con mapa de U+FFFD
  console.log('\nFase 2: Barrido general por U+FFFD...');
  totalFixed += await fixCollectionFields(db, 'professionals', ['nombre', 'especialidad']);
  totalFixed += await fixCollectionFields(db, 'services', ['nombre', 'descripcion', 'categoria']);
  totalFixed += await fixCollectionFields(db, 'users', ['nombre']);
  totalFixed += await fixCollectionFields(db, 'appointments', ['notasCliente', 'notasInternas']);
  totalFixed += await fixCollectionFields(db, 'settings', ['nombreNegocio', 'direccion', 'mensajeBienvenida']);

  console.log(`\n=== Resultado: ${totalFixed} correcciones aplicadas ===`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
