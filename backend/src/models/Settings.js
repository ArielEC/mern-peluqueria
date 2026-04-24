import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Clave única para identificar la configuración (solo habrá un documento)
  _id: {
    type: String,
    default: 'global'
  },
  // Nombre del negocio
  nombreNegocio: {
    type: String,
    default: 'Mi Peluquería',
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  // Información de contacto
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  direccion: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  // Horas mínimas de antelación para cancelar una cita
  horasMinimasCancelacion: {
    type: Number,
    default: 24,
    min: [0, 'Las horas mínimas no pueden ser negativas']
  },
  // Días máximos de antelación para reservar
  diasMaximosReserva: {
    type: Number,
    default: 30,
    min: [1, 'Debe permitir al menos 1 día de antelación'],
    max: [365, 'No puede exceder 365 días']
  },
  // Duración del slot mínimo en minutos (grid de 15 minutos)
  duracionSlot: {
    type: Number,
    default: 15,
    enum: [15, 30]
  },
  // Mensaje de bienvenida para clientes
  mensajeBienvenida: {
    type: String,
    trim: true,
    maxlength: [500, 'El mensaje no puede exceder 500 caracteres']
  },
  // Políticas de cancelación (texto para mostrar al cliente)
  politicaCancelacion: {
    type: String,
    trim: true,
    maxlength: [1000, 'La política no puede exceder 1000 caracteres']
  },
  // Zona horaria IANA del negocio (para cálculos de disponibilidad y fechas)
  zonaHoraria: {
    type: String,
    default: 'Europe/Madrid',
    trim: true,
    maxlength: [60, 'La zona horaria no puede exceder 60 caracteres']
  },
  // Configuración de notificaciones (placeholder para futuro)
  notificaciones: {
    emailConfirmacion: { type: Boolean, default: false },
    emailRecordatorio: { type: Boolean, default: false },
    horasAntesRecordatorio: { type: Number, default: 24 }
  }
}, {
  timestamps: true
});

// Cache en memoria para evitar consultas repetidas a MongoDB.
// Se reemplaza en cada llamada a updateGlobal e invalida con invalidateCache().
let _settingsCache = null;

// Obtener la configuración global. Sirve el cache si está disponible.
// Usa findOneAndUpdate atómico (upsert) para eliminar race condition en arranque.
// Devuelve un POJO congelado para evitar mutaciones accidentales del cache compartido.
settingsSchema.statics.getGlobal = async function() {
  if (_settingsCache) return _settingsCache;
  const settings = await this.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { _id: 'global' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  _settingsCache = Object.freeze(settings);
  return _settingsCache;
};

// Actualizar la configuración global y refrescar el cache.
settingsSchema.statics.updateGlobal = async function(updates) {
  const settings = await this.findByIdAndUpdate(
    'global',
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  _settingsCache = Object.freeze(settings);
  return settings;
};

// Invalida el cache — útil en tests o ante cambios externos a la DB.
settingsSchema.statics.invalidateCache = function() {
  _settingsCache = null;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
