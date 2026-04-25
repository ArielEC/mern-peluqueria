import Appointment from '../models/Appointment.js';
import Blocker from '../models/Blocker.js';
import Professional from '../models/Professional.js';
import Service from '../models/Service.js';
import { emitQuerySync } from '../services/querySync.service.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

/**
 * GET /api/professionals
 * Listar todos los profesionales
 * Acceso: Público (para reservas) o Admin
 */
export const getAllProfessionals = async (req, res) => {
  try {
    const { activo } = req.query;
    const filter = {};
    
    // Filtrar por estado activo si se especifica
    if (activo !== undefined) {
      if (activo !== 'true' && activo !== 'false') {
        return res.status(400).json({ error: 'Parámetro activo inválido (usa true/false)' });
      }
      filter.activo = activo === 'true';
    }

    const professionals = await Professional.find(filter).sort({ nombre: 1 });
    res.json(professionals);
  } catch (error) {
    console.error('Error al obtener profesionales:', error);
    res.status(500).json({ error: 'Error al obtener los profesionales' });
  }
};

/**
 * GET /api/professionals/:id
 * Obtener un profesional por ID
 * Acceso: Público o Admin
 */
export const getProfessionalById = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    res.json(professional);
  } catch (error) {
    console.error('Error al obtener profesional:', error);
    res.status(500).json({ error: 'Error al obtener el profesional' });
  }
};

/**
 * POST /api/professionals
 * Crear un nuevo profesional
 * Acceso: Solo Admin
 */
export const createProfessional = async (req, res) => {
  try {
    const professional = new Professional(req.validatedBody);
    await professional.save();
    emitQuerySync('professionals');
    
    res.status(201).json(professional);
  } catch (error) {
    console.error('Error al crear profesional:', error);
    res.status(500).json({ error: 'Error al crear el profesional' });
  }
};

/**
 * PUT /api/professionals/:id
 * Actualizar un profesional
 * Acceso: Solo Admin
 */
export const updateProfessional = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      { $set: req.validatedBody },
      { new: true, runValidators: true }
    );

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    emitQuerySync('professionals');
    res.json(professional);
  } catch (error) {
    console.error('Error al actualizar profesional:', error);
    res.status(500).json({ error: 'Error al actualizar el profesional' });
  }
};

/**
 * DELETE /api/professionals/:id
 * Eliminar un profesional definitivamente si no tiene citas asociadas
 * Acceso: Solo Admin
 */
export const deleteProfessional = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const professional = await Professional.findById(req.params.id).select('_id nombre');

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const hasAppointments = await Appointment.exists({ profesional: req.params.id });

    if (hasAppointments) {
      return res.status(409).json({
        error: 'No se puede eliminar un profesional con citas asociadas. Puedes dejarlo inactivo desde editar.',
        code: 'PROFESSIONAL_HAS_APPOINTMENTS'
      });
    }

    await Promise.all([
      Service.updateMany(
        { profesionalesCapaces: req.params.id },
        { $pull: { profesionalesCapaces: req.params.id } }
      ),
      Blocker.deleteMany({ profesional: req.params.id }),
      Professional.deleteOne({ _id: req.params.id })
    ]);

    emitQuerySync('professionals', 'services', 'blockers');
    res.json({
      message: 'Profesional eliminado correctamente',
      professionalId: req.params.id
    });
  } catch (error) {
    console.error('Error al eliminar profesional:', error);
    res.status(500).json({ error: 'Error al eliminar el profesional' });
  }
};
