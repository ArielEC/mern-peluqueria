import TechnicalNote from '../models/TechnicalNote.js';
import User from '../models/User.js';
import { emitQuerySync } from '../services/querySync.service.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const CATEGORIAS_NOTA_VALIDAS = new Set(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']);
const TECHNICAL_NOTE_FIELDS = 'cliente titulo contenido categoria importante createdAt updatedAt';

const parseBooleanQuery = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false, value: undefined };
};

/**
 * GET /api/technical-notes
 * Listar todas las notas tecnicas filtrando por clienteId (query)
 * Acceso: Solo Admin
 */
export const getNotesByClient = async (req, res) => {
  try {
    const { clienteId, categoria, importante } = req.query;

    if (!clienteId) {
      return res.status(400).json({ error: 'clienteId es requerido' });
    }

    if (!OBJECT_ID_REGEX.test(clienteId)) {
      return res.status(400).json({ error: 'clienteId invalido' });
    }

    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const filter = { cliente: clienteId };

    if (categoria) {
      if (!CATEGORIAS_NOTA_VALIDAS.has(categoria)) {
        return res.status(400).json({ error: 'categoria invalida' });
      }
      filter.categoria = categoria;
    }

    if (importante !== undefined) {
      const importanteParsed = parseBooleanQuery(importante);
      if (!importanteParsed.ok) {
        return res.status(400).json({ error: 'Parametro importante invalido (usa true/false)' });
      }
      filter.importante = importanteParsed.value;
    }

    const notes = await TechnicalNote.find(filter)
      .select(TECHNICAL_NOTE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error('Error al obtener notas tecnicas:', error);
    res.status(500).json({ error: 'Error al obtener las notas tecnicas' });
  }
};

/**
 * GET /api/technical-notes/:id
 * Obtener una nota tecnica especifica
 * Acceso: Solo Admin
 */
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const note = await TechnicalNote.findById(id).select(TECHNICAL_NOTE_FIELDS);

    if (!note) {
      return res.status(404).json({ error: 'Nota tecnica no encontrada' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error al obtener nota tecnica:', error);
    res.status(500).json({ error: 'Error al obtener la nota tecnica' });
  }
};

/**
 * POST /api/technical-notes
 * Crear una nueva nota tecnica para un cliente
 * Acceso: Solo Admin
 */
export const createNote = async (req, res) => {
  try {
    const { clienteId, ...restData } = req.validatedBody;

    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const createdNote = await TechnicalNote.create({ ...restData, cliente: clienteId });
    const note = await TechnicalNote.findById(createdNote._id).select(TECHNICAL_NOTE_FIELDS);

    emitQuerySync('technicalNotes');
    res.status(201).json(note);
  } catch (error) {
    console.error('Error al crear nota tecnica:', error);
    res.status(500).json({ error: 'Error al crear la nota tecnica' });
  }
};

/**
 * PUT /api/technical-notes/:id
 * Actualizar una nota tecnica
 * Acceso: Solo Admin
 */
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const note = await TechnicalNote.findByIdAndUpdate(
      id,
      { $set: req.validatedBody },
      { new: true, runValidators: true }
    ).select(TECHNICAL_NOTE_FIELDS);

    if (!note) {
      return res.status(404).json({ error: 'Nota tecnica no encontrada' });
    }

    emitQuerySync('technicalNotes');
    res.json(note);
  } catch (error) {
    console.error('Error al actualizar nota tecnica:', error);
    res.status(500).json({ error: 'Error al actualizar la nota tecnica' });
  }
};

/**
 * DELETE /api/technical-notes/:id
 * Eliminar una nota tecnica
 * Acceso: Solo Admin
 */
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const note = await TechnicalNote.findByIdAndDelete(id);

    if (!note) {
      return res.status(404).json({ error: 'Nota tecnica no encontrada' });
    }

    emitQuerySync('technicalNotes');
    res.json({ message: 'Nota tecnica eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar nota tecnica:', error);
    res.status(500).json({ error: 'Error al eliminar la nota tecnica' });
  }
};
