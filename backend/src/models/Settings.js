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
  // Configuración de notificaciones (placeholder para futuro)
  notificaciones: {
    emailConfirmacion: { type: Boolean, default: false },
    emailRecordatorio: { type: Boolean, default: false },
    horasAntesRecordatorio: { type: Number, default: 24 }
  }
}, {
  timestamps: true
});

// Método estático para obtener la configuración global (crea una por defecto si no existe)
settingsSchema.statics.getGlobal = async function() {
  let settings = await this.findById('global');
  if (!settings) {
    settings = await this.create({ _id: 'global' });
  }
  return settings;
};

// Método estático para actualizar la configuración global
settingsSchema.statics.updateGlobal = async function(updates) {
  const settings = await this.findByIdAndUpdate(
    'global',
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
