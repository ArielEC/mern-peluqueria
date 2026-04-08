import Professional from '../models/Professional.js';
import { createProfessionalSchema, updateProfessionalSchema } from '../validators/professional.validator.js';

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
    // Validar datos de entrada
    const validationResult = createProfessionalSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const professional = new Professional(validationResult.data);
    await professional.save();
    
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
    // Validar datos de entrada
    const validationResult = updateProfessionalSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      { $set: validationResult.data },
      { new: true, runValidators: true }
    );

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    res.json(professional);
  } catch (error) {
    console.error('Error al actualizar profesional:', error);
    res.status(500).json({ error: 'Error al actualizar el profesional' });
  }
};

/**
 * DELETE /api/professionals/:id
 * Eliminar un profesional (soft delete - desactivar)
 * Acceso: Solo Admin
 */
export const deleteProfessional = async (req, res) => {
  try {
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false } },
      { new: true }
    );

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    res.json({ message: 'Profesional desactivado correctamente', professional });
  } catch (error) {
    console.error('Error al eliminar profesional:', error);
    res.status(500).json({ error: 'Error al eliminar el profesional' });
  }
};
