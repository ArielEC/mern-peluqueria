import mongoose from 'mongoose';

const technicalNoteSchema = new mongoose.Schema({
  // Cliente al que pertenece la nota
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El cliente es obligatorio']
  },
  // Titulo de la nota
  titulo: {
    type: String,
    trim: true,
    maxlength: [100, 'El titulo no puede exceder 100 caracteres']
  },
  // Contenido de la nota tecnica
  contenido: {
    type: String,
    required: [true, 'El contenido es obligatorio'],
    trim: true,
    maxlength: [2000, 'El contenido no puede exceder 2000 caracteres']
  },
  // Categoria de la nota (para filtrado)
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

// Indices
technicalNoteSchema.index({ cliente: 1, createdAt: -1 });
technicalNoteSchema.index({ categoria: 1 });
technicalNoteSchema.index({ cliente: 1, importante: 1 });

const TechnicalNote = mongoose.model('TechnicalNote', technicalNoteSchema);

export default TechnicalNote;
