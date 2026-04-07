import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware para verificar el token JWT en las peticiones.
 * Extrae el token del header Authorization (formato: "Bearer <token>")
 * y adjunta el usuario decodificado a req.user
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Acceso no autorizado. Token no proporcionado.' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos para asegurar que sigue existiendo y está activo
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado.' 
      });
    }

    if (!user.activo) {
      return res.status(401).json({ 
        error: 'Cuenta desactivada. Contacta con el administrador.' 
      });
    }

    // Adjuntar usuario a la request para uso en siguientes middlewares/controladores
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado. Por favor, inicia sesión de nuevo.' 
      });
    }
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno de autenticación.' 
    });
  }
};

/**
 * Middleware para verificar que el usuario tiene rol de administrador.
 * Debe usarse DESPUÉS de authenticateToken.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Acceso no autorizado.' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requieren permisos de administrador.' 
    });
  }

  next();
};

/**
 * Middleware para verificar que el usuario es cliente o admin.
 * Útil para rutas donde ambos roles tienen acceso pero con diferente comportamiento.
 * Debe usarse DESPUÉS de authenticateToken.
 */
export const requireClienteOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Acceso no autorizado.' 
    });
  }

  if (req.user.role !== 'cliente' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado.' 
    });
  }

  next();
};

/**
 * Middleware opcional de autenticación.
 * Si hay token válido, adjunta el usuario a req.user.
 * Si no hay token o es inválido, continúa sin error (req.user será undefined).
 * Útil para rutas públicas que muestran info extra a usuarios autenticados.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // Continuar sin usuario
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user?.activo) {
      req.user = user;
    }
  } catch (error) {
    // Ignorar errores esperables de token y registrar errores inesperados
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      console.error('Error en optionalAuth:', error);
    }
  }
  next();
};

/**
 * Genera un token JWT para un usuario.
 * Duración: 30 días (según decisión arquitectónica del proyecto).
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
