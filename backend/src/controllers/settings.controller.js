import Settings from '../models/Settings.js';
import { emitQuerySync } from '../services/querySync.service.js';

/**
 * GET /api/settings
 * Obtener la configuración global del negocio
 * Acceso: Solo Admin (garantizado por requireAdmin en la ruta)
 */
export const getSettings = async (req, res) => {
  try {
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
 * Acceso: Solo Admin (garantizado por requireAdmin en la ruta)
 */
export const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.updateGlobal(req.validatedBody);
    emitQuerySync('settings');
    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};
