import mongoose from 'mongoose';

const technicalNoteSchema = new mongoose.Schema({
  // Cliente al que pertenece la nota
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El cliente es obligatorio']
  },
  // Cita asociada (opcional - puede ser una nota general del cliente)
  cita: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  // Profesional que crea la nota
  creadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional'
  },
  // Título de la nota
  titulo: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  // Contenido de la nota técnica
  contenido: {
    type: String,
    required: [true, 'El contenido es obligatorio'],
    trim: true,
    maxlength: [2000, 'El contenido no puede exceder 2000 caracteres']
  },
  // Categoría de la nota (para filtrado)
  categoria: {
    type: String,
    enum: ['color', 'tratamiento', 'alergia', 'preferencia', 'otro'],
    default: 'otro'
  },
  // Nivel de importancia
  importante: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices
technicalNoteSchema.index({ cliente: 1, createdAt: -1 });
technicalNoteSchema.index({ cita: 1 });
technicalNoteSchema.index({ categoria: 1 });
technicalNoteSchema.index({ cliente: 1, importante: 1 });

const TechnicalNote = mongoose.model('TechnicalNote', technicalNoteSchema);

export default TechnicalNote;
