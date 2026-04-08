import Blocker from '../models/Blocker.js';
import { createBlockerSchema, updateBlockerSchema } from '../validators/blocker.validator.js';

/**
 * GET /api/blockers
 * Listar todos los bloqueos
 * Acceso: Solo Admin
 */
export const getAllBlockers = async (req, res) => {
  try {
    const { profesional, desde, hasta, tipo } = req.query;
    const filter = {};
    
    if (profesional) {
      filter.profesional = profesional === 'null' ? null : profesional;
    }
    if (tipo) {
      filter.tipo = tipo;
    }
    
    // Filtrar por rango de fechas
    if (desde || hasta) {
      filter.fechaHoraInicio = {};
      if (desde) {
        filter.fechaHoraInicio.$gte = new Date(desde);
      }
      if (hasta) {
        filter.fechaHoraFin = { $lte: new Date(hasta) };
      }
    }

    const blockers = await Blocker.find(filter)
      .populate('profesional', 'nombre color')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaHoraInicio: -1 });
    
    res.json(blockers);
  } catch (error) {
    console.error('Error al obtener bloqueos:', error);
    res.status(500).json({ error: 'Error al obtener los bloqueos' });
  }
};

/**
 * GET /api/blockers/:id
 * Obtener un bloqueo por ID
 * Acceso: Solo Admin
 */
export const getBlockerById = async (req, res) => {
  try {
    const blocker = await Blocker.findById(req.params.id)
      .populate('profesional', 'nombre color')
      .populate('creadoPor', 'nombre email');
    
    if (!blocker) {
      return res.status(404).json({ error: 'Bloqueo no encontrado' });
    }

    res.json(blocker);
  } catch (error) {
    console.error('Error al obtener bloqueo:', error);
    res.status(500).json({ error: 'Error al obtener el bloqueo' });
  }
};

/**
 * POST /api/blockers
 * Crear un nuevo bloqueo
 * Acceso: Solo Admin
 */
export const createBlocker = async (req, res) => {
  try {
    // Validar datos de entrada
    const validationResult = createBlockerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const blockerData = {
      ...validationResult.data,
      creadoPor: req.user._id,
      fechaHoraInicio: new Date(validationResult.data.fechaHoraInicio),
      fechaHoraFin: new Date(validationResult.data.fechaHoraFin)
    };

    const blocker = new Blocker(blockerData);
    await blocker.save();
    
    // Poblar referencias antes de devolver
    await blocker.populate('profesional', 'nombre color');
    await blocker.populate('creadoPor', 'nombre email');
    
    res.status(201).json(blocker);
  } catch (error) {
    console.error('Error al crear bloqueo:', error);
    res.status(500).json({ error: 'Error al crear el bloqueo' });
  }
};

/**
 * PUT /api/blockers/:id
 * Actualizar un bloqueo
 * Acceso: Solo Admin
 */
export const updateBlocker = async (req, res) => {
  try {
    // Validar datos de entrada
    const validationResult = updateBlockerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    // Convertir fechas si están presentes
    const updateData = { ...validationResult.data };
    if (updateData.fechaHoraInicio) {
      updateData.fechaHoraInicio = new Date(updateData.fechaHoraInicio);
    }
    if (updateData.fechaHoraFin) {
      updateData.fechaHoraFin = new Date(updateData.fechaHoraFin);
    }

    const blocker = await Blocker.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('profesional', 'nombre color')
      .populate('creadoPor', 'nombre email');

    if (!blocker) {
      return res.status(404).json({ error: 'Bloqueo no encontrado' });
    }

    res.json(blocker);
  } catch (error) {
    console.error('Error al actualizar bloqueo:', error);
    res.status(500).json({ error: 'Error al actualizar el bloqueo' });
  }
};

/**
 * DELETE /api/blockers/:id
 * Eliminar un bloqueo (hard delete)
 * Acceso: Solo Admin
 */
export const deleteBlocker = async (req, res) => {
  try {
    const blocker = await Blocker.findByIdAndDelete(req.params.id);

    if (!blocker) {
      return res.status(404).json({ error: 'Bloqueo no encontrado' });
    }

    res.json({ message: 'Bloqueo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar bloqueo:', error);
    res.status(500).json({ error: 'Error al eliminar el bloqueo' });
  }
};
