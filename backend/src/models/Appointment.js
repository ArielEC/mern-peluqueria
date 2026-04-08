import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Cliente que reserva la cita
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El cliente es obligatorio']
  },
  // Profesional asignado (asignación automática basada en disponibilidad)
  profesional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional',
    required: [true, 'El profesional es obligatorio']
  },
  // Servicio solicitado
  servicio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'El servicio es obligatorio']
  },
  // Fecha y hora de inicio de la cita
  fechaHoraInicio: {
    type: Date,
    required: [true, 'La fecha y hora de inicio es obligatoria']
  },
  // Fecha y hora de fin (calculada automáticamente basándose en duración del servicio)
  fechaHoraFin: {
    type: Date,
    required: [true, 'La fecha y hora de fin es obligatoria']
  },
  // Fecha y hora de fin operativa en agenda (duración redondeada al grid)
  fechaHoraFinOperativa: {
    type: Date,
    default: null
  },
  // Duración operativa en minutos usada para bloquear agenda
  duracionOperativaMinutos: {
    type: Number,
    min: [15, 'La duración operativa mínima es 15 minutos'],
    default: null
  },
  // Estado de la cita
  estado: {
    type: String,
    enum: ['confirmada', 'completada', 'cancelada', 'no_presentado'],
    default: 'confirmada' // Sin estado PENDING - confirmación automática
  },
  // Precio al momento de la reserva (snapshot del precio del servicio)
  precioFinal: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  // Notas adicionales del cliente
  notasCliente: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  },
  // Notas internas del admin/profesional
  notasInternas: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las notas internas no pueden exceder 1000 caracteres']
  },
  // Indica si fue una reserva forzada por el admin (overbooking)
  forzadaPorAdmin: {
    type: Boolean,
    default: false
  },
  // Motivo de cancelación (si aplica)
  motivoCancelacion: {
    type: String,
    trim: true,
    maxlength: [500, 'El motivo no puede exceder 500 caracteres']
  },
  // Quién canceló la cita
  canceladaPor: {
    type: String,
    enum: ['cliente', 'admin', null],
    default: null
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
appointmentSchema.index({ cliente: 1, fechaHoraInicio: -1 });
appointmentSchema.index({ profesional: 1, fechaHoraInicio: 1 });
appointmentSchema.index({ fechaHoraInicio: 1, fechaHoraFin: 1 });
appointmentSchema.index({ fechaHoraInicio: 1, fechaHoraFinOperativa: 1 });
appointmentSchema.index({ estado: 1 });
appointmentSchema.index({ profesional: 1, estado: 1, fechaHoraInicio: 1 });
appointmentSchema.index({ profesional: 1, estado: 1, fechaHoraInicio: 1, fechaHoraFinOperativa: 1 });

// Backward compatibility para documentos anteriores a AB-05
appointmentSchema.pre('validate', function(next) {
  if (!this.fechaHoraFinOperativa) {
    this.fechaHoraFinOperativa = this.fechaHoraFin;
  }

  if (!this.duracionOperativaMinutos && this.fechaHoraFinOperativa && this.fechaHoraInicio) {
    this.duracionOperativaMinutos = Math.max(
      15,
      Math.round((this.fechaHoraFinOperativa - this.fechaHoraInicio) / (1000 * 60))
    );
  }

  next();
});

// Virtual para verificar si la cita es pasada
appointmentSchema.virtual('esPasada').get(function() {
  return this.fechaHoraFin < new Date();
});

// Virtual para verificar si la cita es hoy
appointmentSchema.virtual('esHoy').get(function() {
  const hoy = new Date();
  return this.fechaHoraInicio.toDateString() === hoy.toDateString();
});

// Virtual para obtener la duración en minutos
appointmentSchema.virtual('duracionMinutos').get(function() {
  return (this.fechaHoraFin - this.fechaHoraInicio) / (1000 * 60);
});

// Virtual para obtener la duración operativa (agenda)
appointmentSchema.virtual('duracionOperativaMinutosCalculada').get(function() {
  if (this.duracionOperativaMinutos) {
    return this.duracionOperativaMinutos;
  }

  const finOperativa = this.fechaHoraFinOperativa || this.fechaHoraFin;
  return (finOperativa - this.fechaHoraInicio) / (1000 * 60);
});

// Método para verificar si se puede cancelar (basado en horasMinimasCancelacion de Settings)
appointmentSchema.methods.puedeCancelar = function(horasMinimas) {
  if (this.estado !== 'confirmada') return false;
  
  const ahora = new Date();
  const horasHastaCita = (this.fechaHoraInicio - ahora) / (1000 * 60 * 60);
  
  return horasHastaCita >= horasMinimas;
};

// Configurar para que los virtuals se incluyan en toJSON
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
