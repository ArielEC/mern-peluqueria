import mongoose from 'mongoose';

const blockerSchema = new mongoose.Schema({
  // Profesional afectado (si es null, aplica a todo el negocio)
  profesional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional',
    default: null
  },
  // Título/motivo del bloqueo
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  // Descripción adicional
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  // Fecha y hora de inicio del bloqueo
  fechaHoraInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  // Fecha y hora de fin del bloqueo
  fechaHoraFin: {
    type: Date,
    required: [true, 'La fecha de fin es obligatoria']
  },
  // Tipo de bloqueo
  tipo: {
    type: String,
    enum: ['vacaciones', 'festivo', 'personal', 'mantenimiento', 'otro'],
    default: 'otro'
  },
  // Si es un bloqueo que se repite (para futuras implementaciones)
  esRecurrente: {
    type: Boolean,
    default: false
  },
  // Creado por (admin)
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para consultas de disponibilidad
blockerSchema.index({ profesional: 1, fechaHoraInicio: 1, fechaHoraFin: 1 });
blockerSchema.index({ fechaHoraInicio: 1, fechaHoraFin: 1 });

// Validación: fechaHoraFin debe ser posterior a fechaHoraInicio
blockerSchema.pre('save', function(next) {
  if (this.fechaHoraFin <= this.fechaHoraInicio) {
    const error = new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    return next(error);
  }
  next();
});

// Método estático para verificar si hay bloqueos en un rango de tiempo
blockerSchema.statics.hayBloqueo = async function(profesionalId, inicio, fin) {
  const query = {
    fechaHoraInicio: { $lt: fin },
    fechaHoraFin: { $gt: inicio },
    $or: [
      { profesional: profesionalId },
      { profesional: null } // Bloqueos globales
    ]
  };
  
  const bloqueo = await this.findOne(query);
  return !!bloqueo;
};

// Método estático para obtener bloqueos en un rango de fechas
blockerSchema.statics.getBloqueos = async function(profesionalId, inicio, fin) {
  const query = {
    fechaHoraInicio: { $lt: fin },
    fechaHoraFin: { $gt: inicio }
  };
  
  if (profesionalId) {
    query.$or = [
      { profesional: profesionalId },
      { profesional: null }
    ];
  }
  
  return await this.find(query).populate('profesional', 'nombre');
};

const Blocker = mongoose.model('Blocker', blockerSchema);

export default Blocker;
