import mongoose from 'mongoose';

// Subesquema para el horario de un día específico
const horarioDiaSchema = new mongoose.Schema({
  activo: {
    type: Boolean,
    default: true
  },
  inicio: {
    type: String, // Formato "HH:MM" (ej: "09:00")
    required: function() { return this.activo; },
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)']
  },
  fin: {
    type: String, // Formato "HH:MM" (ej: "18:00")
    required: function() { return this.activo; },
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)']
  },
  descansoInicio: {
    type: String, // Formato "HH:MM" - inicio del descanso (ej: "14:00")
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)']
  },
  descansoFin: {
    type: String, // Formato "HH:MM" - fin del descanso (ej: "15:00")
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)']
  }
}, { _id: false });

const professionalSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  especialidad: {
    type: String,
    required: [true, 'La especialidad es obligatoria'],
    trim: true,
    maxlength: [100, 'La especialidad no puede exceder 100 caracteres']
  },
  color: {
    type: String,
    default: '#3B82F6', // Azul por defecto
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal inválido']
  },
  activo: {
    type: Boolean,
    default: true
  },
  // Horario semanal - cada día tiene su propio horario
  // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  horarioSemanal: {
    0: { type: horarioDiaSchema, default: () => ({ activo: false }) }, // Domingo
    1: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '19:00', descansoInicio: '14:00', descansoFin: '16:00' }) }, // Lunes
    2: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '19:00', descansoInicio: '14:00', descansoFin: '16:00' }) }, // Martes
    3: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '19:00', descansoInicio: '14:00', descansoFin: '16:00' }) }, // Miércoles
    4: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '19:00', descansoInicio: '14:00', descansoFin: '16:00' }) }, // Jueves
    5: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '19:00', descansoInicio: '14:00', descansoFin: '16:00' }) }, // Viernes
    6: { type: horarioDiaSchema, default: () => ({ activo: true, inicio: '09:00', fin: '14:00' }) }  // Sábado (sin descanso, media jornada)
  }
}, {
  timestamps: true
});

// Índices
professionalSchema.index({ activo: 1 });
professionalSchema.index({ nombre: 1 });

// Método para obtener el horario de un día específico
professionalSchema.methods.getHorarioDia = function(diaSemana) {
  return this.horarioSemanal[diaSemana] || { activo: false };
};

// Método para verificar si trabaja un día específico
professionalSchema.methods.trabajaElDia = function(diaSemana) {
  const horario = this.horarioSemanal[diaSemana];
  return horario?.activo ?? false;
};

const Professional = mongoose.model('Professional', professionalSchema);

export default Professional;
