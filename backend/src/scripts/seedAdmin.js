import mongoose from 'mongoose';
import User from '../models/User.js';
import '../config/loadEnv.js';

/**
 * Script para crear el usuario administrador inicial.
 * Ejecutar con: node src/scripts/seedAdmin.js
 * 
 * Credenciales por defecto (cambiar en producción):
 * - Email: admin@peluqueria.com
 * - Password: admin123
 */
const seedAdmin = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Ya existe un usuario administrador:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log('  (No se creó uno nuevo)');
      process.exit(0);
    }

    // Crear admin por defecto
    const adminData = {
      nombre: 'Administrador',
      email: process.env.ADMIN_EMAIL || 'admin@peluqueria.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      telefono: '600000000',
      role: 'admin',
      activo: true
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('Usuario administrador creado exitosamente:');
    console.log(`  Email: ${adminData.email}`);
    console.log(`  Password: ${'*'.repeat(String(adminData.password).length)}`);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña en producción!');

    process.exit(0);
  } catch (error) {
    console.error('Error al crear admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
