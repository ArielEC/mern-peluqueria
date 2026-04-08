import TechnicalNote from '../models/TechnicalNote.js';
import User from '../models/User.js';
import { createTechnicalNoteSchema, updateTechnicalNoteSchema } from '../validators/technicalNote.validator.js';

/**
 * GET /api/technical-notes/:clienteId
 * Listar todas las notas técnicas de un cliente
 * Acceso: Solo Admin
 */
export const getNotesByClient = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { categoria, importante } = req.query;
    
    // Verificar que el cliente existe
    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const filter = { cliente: clienteId };
    
    if (categoria) {
      filter.categoria = categoria;
    }
    if (importante !== undefined) {
      filter.importante = importante === 'true';
    }

    const notes = await TechnicalNote.find(filter)
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHora')
      .sort({ createdAt: -1 });
    
    res.json(notes);
  } catch (error) {
    console.error('Error al obtener notas técnicas:', error);
    res.status(500).json({ error: 'Error al obtener las notas técnicas' });
  }
};

/**
 * GET /api/technical-notes/:clienteId/:noteId
 * Obtener una nota técnica específica
 * Acceso: Solo Admin
 */
export const getNoteById = async (req, res) => {
  try {
    const { clienteId, noteId } = req.params;
    
    const note = await TechnicalNote.findOne({ 
      _id: noteId, 
      cliente: clienteId 
    })
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHora');
    
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
 * POST /api/technical-notes/:clienteId
 * Crear una nueva nota técnica para un cliente
 * Acceso: Solo Admin
 */
export const createNote = async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Verificar que el cliente existe
    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Validar datos de entrada
    const validationResult = createTechnicalNoteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const noteData = {
      ...validationResult.data,
      cliente: clienteId
    };

    const note = new TechnicalNote(noteData);
    await note.save();
    
    // Poblar referencias antes de devolver
    await note.populate('creadaPor', 'nombre');
    if (note.cita) {
      await note.populate('cita', 'fechaHora');
    }
    
    res.status(201).json(note);
  } catch (error) {
    console.error('Error al crear nota técnica:', error);
    res.status(500).json({ error: 'Error al crear la nota técnica' });
  }
};

/**
 * PUT /api/technical-notes/:clienteId/:noteId
 * Actualizar una nota técnica
 * Acceso: Solo Admin
 */
export const updateNote = async (req, res) => {
  try {
    const { clienteId, noteId } = req.params;
    
    // Validar datos de entrada
    const validationResult = updateTechnicalNoteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const note = await TechnicalNote.findOneAndUpdate(
      { _id: noteId, cliente: clienteId },
      { $set: validationResult.data },
      { new: true, runValidators: true }
    )
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHora');

    if (!note) {
      return res.status(404).json({ error: 'Nota técnica no encontrada' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error al actualizar nota técnica:', error);
    res.status(500).json({ error: 'Error al actualizar la nota técnica' });
  }
};

/**
 * DELETE /api/technical-notes/:clienteId/:noteId
 * Eliminar una nota técnica
 * Acceso: Solo Admin
 */
export const deleteNote = async (req, res) => {
  try {
    const { clienteId, noteId } = req.params;
    
    const note = await TechnicalNote.findOneAndDelete({ 
      _id: noteId, 
      cliente: clienteId 
    });

    if (!note) {
      return res.status(404).json({ error: 'Nota técnica no encontrada' });
    }

    res.json({ message: 'Nota técnica eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar nota técnica:', error);
    res.status(500).json({ error: 'Error al eliminar la nota técnica' });
  }
};
