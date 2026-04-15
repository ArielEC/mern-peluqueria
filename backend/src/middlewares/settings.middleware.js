import Settings from '../models/Settings.js';

/**
 * Middleware que carga la configuración global del negocio en req.settings.
 * Aprovecha el cache en memoria de Settings.getGlobal() para evitar
 * consultas repetidas a MongoDB dentro de la misma petición o entre peticiones.
 *
 * Uso en rutas:
 *   router.post('/', authenticateToken, loadSettings, validate(schema), handler);
 *
 * Los controladores leen req.settings en lugar de llamar a Settings.getGlobal().
 */
export const loadSettings = async (req, res, next) => {
  try {
    req.settings = await Settings.getGlobal();
    next();
  } catch (error) {
    next(error);
  }
};
