import Blocker from '../models/Blocker.js';
import { createBlockerSchema, updateBlockerSchema } from '../validators/blocker.validator.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const FECHA_SIMPLE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parsearFechaFiltro = (value, finDelDia = false) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const esFechaSimple = FECHA_SIMPLE_REGEX.test(trimmed);
  const fecha = esFechaSimple
    ? new Date(`${trimmed}T${finDelDia ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(trimmed);

  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
};

/**
 * GET /api/blockers
 * Listar todos los bloqueos
 * Acceso: Solo Admin
 */
export const getAllBlockers = async (req, res) => {
  try {
    const { desde, hasta, tipo } = req.query;
    const profesionalId = req.query.profesionalId ?? req.query.profesional;
    const filter = {};
    
    if (profesionalId) {
      if (profesionalId === 'null') {
        filter.profesional = null;
      } else {
        if (!OBJECT_ID_REGEX.test(profesionalId)) {
          return res.status(400).json({ error: 'profesionalId inválido' });
        }
        filter.profesional = profesionalId;
      }
    }
    if (tipo) {
      const TIPOS_VALIDOS = ['vacaciones', 'festivo', 'personal', 'mantenimiento', 'otro'];
      if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ error: 'tipo inválido' });
      }
      filter.tipo = tipo;
    }
    
    // Filtrar por rango de fechas con intersección de intervalos
    if (desde || hasta) {
      const desdeDate = desde ? parsearFechaFiltro(desde, false) : null;
      const hastaDate = hasta ? parsearFechaFiltro(hasta, true) : null;

      if (desde && !desdeDate) {
        return res.status(400).json({ error: 'Parámetro desde inválido' });
      }
      if (hasta && !hastaDate) {
        return res.status(400).json({ error: 'Parámetro hasta inválido' });
      }
      if (desdeDate && hastaDate && desdeDate > hastaDate) {
        return res.status(400).json({ error: 'El rango de fechas es inválido' });
      }

      if (hastaDate) {
        filter.fechaHoraInicio = { $lte: hastaDate };
      }
      if (desdeDate) {
        filter.fechaHoraFin = { $gte: desdeDate };
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
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

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
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

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
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

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
