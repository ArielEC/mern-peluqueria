import User from '../models/User.js';
import { generateToken } from '../middlewares/auth.middleware.js';

/**
 * GET /api/auth/clients
 * Lista todos los clientes (solo admin).
 * Query params: search (nombre/email), activo (true/false)
 */
export const listClients = async (req, res) => {
  try {
    const { search, activo } = req.query;
    const filter = { role: 'cliente' };

    if (activo !== undefined) {
      filter.activo = activo === 'true';
    }
    if (search) {
      // Escapar metacaracteres antes de crear el RegExp para evitar ReDoS
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ nombre: regex }, { email: regex }, { telefono: regex }];
    }

    // Paginación básica para evitar respuestas sin límite
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      User.find(filter)
        .select('nombre email telefono activo createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al listar clientes.' });
  }
};

/**
 * POST /api/auth/register
 * Registra un nuevo cliente en el sistema.
 * Solo se pueden registrar clientes por esta vía (el admin se crea por seed).
 */
export const register = async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.validatedBody;

    // Verificar si el email ya está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Ya existe una cuenta con este email.' 
      });
    }

    // Crear nuevo usuario (siempre como cliente)
    const user = new User({
      nombre,
      email,
      password,
      telefono,
      role: 'cliente' // Forzamos rol cliente en registro público
    });

    await user.save();

    // Generar token JWT
    const token = generateToken(user._id);

    // Notificación placeholder (futuro: enviar email de bienvenida)
    console.log(`[NOTIFICACIÓN] Nuevo usuario registrado: ${email}`);

    res.status(201).json({
      message: 'Registro exitoso',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario.' 
    });
  }
};

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve un token JWT.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    // Buscar usuario incluyendo el password (select: false por defecto)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales incorrectas.' 
      });
    }

    // Verificar si la cuenta está activa
    if (!user.activo) {
      return res.status(401).json({ 
        error: 'Cuenta desactivada. Contacta con el administrador.' 
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Credenciales incorrectas.' 
      });
    }

    // Generar token JWT
    const token = generateToken(user._id);

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error al iniciar sesión.' 
    });
  }
};

/**
 * GET /api/auth/me
 * Obtiene el perfil del usuario autenticado.
 * Requiere autenticación (middleware authenticateToken).
 */
export const getProfile = async (req, res) => {
  try {
    // req.user ya viene del middleware authenticateToken
    res.json({
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      error: 'Error al obtener perfil.' 
    });
  }
};

/**
 * PUT /api/auth/me
 * Actualiza el perfil del usuario autenticado (nombre, teléfono).
 * No permite cambiar email ni password por esta vía.
 */
export const updateProfile = async (req, res) => {
  try {
    const { nombre, telefono } = req.validatedBody;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado.' 
      });
    }

    // Actualizar solo los campos permitidos
    if (nombre !== undefined) user.nombre = nombre;
    if (telefono !== undefined) user.telefono = telefono;

    await user.save();

    res.json({
      message: 'Perfil actualizado correctamente',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      error: 'Error al actualizar perfil.' 
    });
  }
};

/**
 * PUT /api/auth/change-password
 * Cambia la contraseña del usuario autenticado.
 * Requiere la contraseña actual para verificación.
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validatedBody;
    const userId = req.user._id;

    // Obtener usuario con password
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado.' 
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'La contraseña actual es incorrecta.' 
      });
    }

    // Actualizar contraseña (se hasheará automáticamente por el middleware pre-save)
    // Registrar fecha de cambio para invalidar tokens anteriores (SEC-3)
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Notificación placeholder
    console.log(`[NOTIFICACIÓN] Contraseña cambiada para: ${user.email}`);

    res.json({
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ 
      error: 'Error al cambiar contraseña.' 
    });
  }
};
