import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir password en queries por defecto
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^\d{9,15}$/, 'Por favor ingresa un teléfono válido']
  },
  role: {
    type: String,
    enum: ['cliente', 'admin'],
    default: 'cliente'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // createdAt, updatedAt automáticos
});

// Índices
userSchema.index({ role: 1 });

// Middleware pre-save para hashear password
userSchema.pre('save', async function(next) {
  // Solo hashear si el password ha sido modificado
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener datos públicos (sin password)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    nombre: this.nombre,
    email: this.email,
    telefono: this.telefono,
    role: this.role,
    activo: this.activo,
    createdAt: this.createdAt
  };
};

const User = mongoose.model('User', userSchema);

export default User;
