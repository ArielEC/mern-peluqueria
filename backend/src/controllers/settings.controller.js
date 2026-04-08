import Settings from '../models/Settings.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

/**
 * GET /api/settings
 * Obtener la configuración global del negocio
 * Acceso: Público (para mostrar info en home) o Admin (para editar)
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
 * Acceso: Solo Admin
 */
export const updateSettings = async (req, res) => {
  try {
    // Validar datos de entrada
    const validationResult = updateSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const settings = await Settings.updateGlobal(validationResult.data);
    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};
