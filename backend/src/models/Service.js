import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del servicio es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  duracion: {
    type: Number, // Duración real en minutos (independiente del grid de agenda)
    required: [true, 'La duración es obligatoria'],
    min: [15, 'La duración mínima es 15 minutos'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v) && v > 0;
      },
      message: 'La duración debe ser un número entero positivo de minutos'
    }
  },
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  categoria: {
    type: String,
    trim: true,
    maxlength: [50, 'La categoría no puede exceder 50 caracteres']
  },
  // Array de IDs de profesionales que pueden realizar este servicio
  profesionalesCapaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional'
  }],
  activo: {
    type: Boolean,
    default: true
  },
  // Orden para mostrar en el listado
  orden: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices
serviceSchema.index({ activo: 1, orden: 1 });
serviceSchema.index({ categoria: 1 });
serviceSchema.index({ profesionalesCapaces: 1 });

// Virtual para obtener la duración formateada
serviceSchema.virtual('duracionFormateada').get(function() {
  const horas = Math.floor(this.duracion / 60);
  const minutos = this.duracion % 60;
  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas}h`;
  return `${horas}h ${minutos}min`;
});

// Virtual para obtener el precio formateado
serviceSchema.virtual('precioFormateado').get(function() {
  return `${this.precio.toFixed(2)} €`;
});

// Configurar para que los virtuals se incluyan en toJSON
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
