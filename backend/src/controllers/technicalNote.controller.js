import TechnicalNote from '../models/TechnicalNote.js';
import User from '../models/User.js';
import Professional from '../models/Professional.js';
import { emitQuerySync } from '../services/querySync.service.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const parseBooleanQuery = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false, value: undefined };
};

const CATEGORIAS_NOTA_VALIDAS = new Set(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']);

/**
 * GET /api/technical-notes
 * Listar todas las notas técnicas filtrando por clienteId (query)
 * Acceso: Solo Admin
 */
export const getNotesByClient = async (req, res) => {
  try {
    const { clienteId, cita, categoria, importante } = req.query;

    if (!clienteId) {
      return res.status(400).json({ error: 'clienteId es requerido' });
    }

    if (!OBJECT_ID_REGEX.test(clienteId)) {
      return res.status(400).json({ error: 'clienteId inválido' });
    }
    
    // Verificar que el cliente existe
    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const filter = { cliente: clienteId };

    if (cita) {
      if (!OBJECT_ID_REGEX.test(cita)) {
        return res.status(400).json({ error: 'cita inválida' });
      }
      filter.cita = cita;
    }
    
    if (categoria) {
      if (!CATEGORIAS_NOTA_VALIDAS.has(categoria)) {
        return res.status(400).json({ error: 'categoria inválida' });
      }
      filter.categoria = categoria;
    }
    if (importante !== undefined) {
      const importanteParsed = parseBooleanQuery(importante);
      if (!importanteParsed.ok) {
        return res.status(400).json({ error: 'Parámetro importante inválido (usa true/false)' });
      }
      filter.importante = importanteParsed.value;
    }

    const notes = await TechnicalNote.find(filter)
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHoraInicio fechaHoraFin estado')
      .sort({ createdAt: -1 });
    
    res.json(notes);
  } catch (error) {
    console.error('Error al obtener notas técnicas:', error);
    res.status(500).json({ error: 'Error al obtener las notas técnicas' });
  }
};

/**
 * GET /api/technical-notes/:id
 * Obtener una nota técnica específica
 * Acceso: Solo Admin
 */
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    
    const note = await TechnicalNote.findById(id)
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHoraInicio fechaHoraFin estado');
    
    if (!note) {
      return res.status(404).json({ error: 'Nota técnica no encontrada' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error al obtener nota técnica:', error);
    res.status(500).json({ error: 'Error al obtener la nota técnica' });
  }
};

/**
 * POST /api/technical-notes
 * Crear una nueva nota técnica para un cliente
 * Acceso: Solo Admin
 */
export const createNote = async (req, res) => {
  try {
    const { clienteId, ...restData } = req.validatedBody;

    // Verificar que el cliente existe
    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const noteData = { ...restData, cliente: clienteId };

    if (noteData.creadaPor) {
      // Verificamos que el profesional exista para mantener coherencia referencial.
      const profesionalExiste = await Professional.exists({ _id: noteData.creadaPor });
      if (!profesionalExiste) {
        return res.status(404).json({ error: 'Profesional no encontrado para creadaPor' });
      }
    }

    const note = new TechnicalNote(noteData);
    await note.save();
    
    // Poblar referencias antes de devolver
    await note.populate('creadaPor', 'nombre');
    if (note.cita) {
      await note.populate('cita', 'fechaHoraInicio fechaHoraFin estado');
    }
    
    emitQuerySync('technicalNotes');
    res.status(201).json(note);
  } catch (error) {
    console.error('Error al crear nota técnica:', error);
    res.status(500).json({ error: 'Error al crear la nota técnica' });
  }
};

/**
 * PUT /api/technical-notes/:id
 * Actualizar una nota técnica
 * Acceso: Solo Admin
 */
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    
    const updateData = req.validatedBody;

    if (updateData.creadaPor) {
      const profesionalExiste = await Professional.exists({ _id: updateData.creadaPor });
      if (!profesionalExiste) {
        return res.status(404).json({ error: 'Profesional no encontrado para creadaPor' });
      }
    }

    const note = await TechnicalNote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHoraInicio fechaHoraFin estado');

    if (!note) {
      return res.status(404).json({ error: 'Nota técnica no encontrada' });
    }

    emitQuerySync('technicalNotes');
    res.json(note);
  } catch (error) {
    console.error('Error al actualizar nota técnica:', error);
    res.status(500).json({ error: 'Error al actualizar la nota técnica' });
  }
};

/**
 * DELETE /api/technical-notes/:id
 * Eliminar una nota técnica
 * Acceso: Solo Admin
 */
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    
    const note = await TechnicalNote.findByIdAndDelete(id);

    if (!note) {
      return res.status(404).json({ error: 'Nota técnica no encontrada' });
    }

    emitQuerySync('technicalNotes');
    res.json({ message: 'Nota técnica eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar nota técnica:', error);
    res.status(500).json({ error: 'Error al eliminar la nota técnica' });
  }
};
