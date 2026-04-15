import Settings from '../models/Settings.js';

/**
 * GET /api/settings
 * Obtener la configuración global del negocio
 * Acceso: Solo Admin
 */
export const getSettings = async (req, res) => {
  try {
    // Mantener comportamiento definido en la biblia: solo admin puede leer settings completos.
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const settings = await Settings.getGlobal();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener settings:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

/**
 * PUT /api/settings
 * Actualizar la configuración global del negocio
 * Acceso: Solo Admin
 */
export const updateSettings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const settings = await Settings.updateGlobal(req.validatedBody);
    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};
