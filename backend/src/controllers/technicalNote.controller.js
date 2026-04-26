import Appointment from '../models/Appointment.js';
import Professional from '../models/Professional.js';
import TechnicalNote from '../models/TechnicalNote.js';
import User from '../models/User.js';
import { emitQuerySync } from '../services/querySync.service.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const CATEGORIAS_NOTA_VALIDAS = new Set(['color', 'tratamiento', 'alergia', 'preferencia', 'otro']);

const parseBooleanQuery = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false, value: undefined };
};

const sincronizarNotaInternaDeCita = async (note, session) => {
  if (!note?.cita) {
    return false;
  }

  const appointment = await Appointment.findById(note.cita).session(session);

  if (!appointment) {
    return false;
  }

  const contenido = note.contenido?.trim() || '';

  if (appointment.notasInternas === contenido) {
    return false;
  }

  appointment.notasInternas = contenido;
  await appointment.save({ session });
  return true;
};

const limpiarNotaInternaDeCita = async (appointmentId, session) => {
  if (!appointmentId) {
    return false;
  }

  const appointment = await Appointment.findById(appointmentId).session(session);

  if (!appointment || !appointment.notasInternas) {
    return false;
  }

  appointment.notasInternas = '';
  await appointment.save({ session });
  return true;
};

const validarCitaVinculada = async (appointmentId, clienteId) => {
  if (!appointmentId) {
    return null;
  }

  if (!OBJECT_ID_REGEX.test(appointmentId)) {
    return { status: 400, error: 'cita invalida' };
  }

  const appointment = await Appointment.findById(appointmentId).select('_id cliente');

  if (!appointment) {
    return { status: 404, error: 'Cita no encontrada' };
  }

  if (appointment.cliente.toString() !== clienteId.toString()) {
    return { status: 400, error: 'La cita vinculada no pertenece a este cliente' };
  }

  return null;
};

/**
 * GET /api/technical-notes
 * Listar todas las notas tecnicas filtrando por clienteId (query)
 * Acceso: Solo Admin
 */
export const getNotesByClient = async (req, res) => {
  try {
    const { clienteId, cita, categoria, importante } = req.query;

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

    if (cita) {
      if (!OBJECT_ID_REGEX.test(cita)) {
        return res.status(400).json({ error: 'cita invalida' });
      }
      filter.cita = cita;
    }

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
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHoraInicio fechaHoraFin estado')
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

    const note = await TechnicalNote.findById(id)
      .populate('creadaPor', 'nombre')
      .populate('cita', 'fechaHoraInicio fechaHoraFin estado');

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

    const noteData = { ...restData, cliente: clienteId };

    if (noteData.creadaPor) {
      const profesionalExiste = await Professional.exists({ _id: noteData.creadaPor });
      if (!profesionalExiste) {
        return res.status(404).json({ error: 'Profesional no encontrado para creadaPor' });
      }
    }

    const citaError = await validarCitaVinculada(noteData.cita, clienteId);
    if (citaError) {
      return res.status(citaError.status).json({ error: citaError.error });
    }

    const session = await TechnicalNote.startSession();
    let note = null;
    let appointmentUpdated = false;

    try {
      await session.withTransaction(async () => {
        note = new TechnicalNote(noteData);
        await note.save({ session });
        appointmentUpdated = await sincronizarNotaInternaDeCita(note, session);
      });
    } finally {
      await session.endSession();
    }

    await note.populate('creadaPor', 'nombre');
    if (note.cita) {
      await note.populate('cita', 'fechaHoraInicio fechaHoraFin estado');
    }

    emitQuerySync('technicalNotes');
    if (appointmentUpdated) {
      emitQuerySync('appointments');
    }

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

    const updateData = req.validatedBody;
    const existingNote = await TechnicalNote.findById(id).select('cita cliente');

    if (!existingNote) {
      return res.status(404).json({ error: 'Nota tecnica no encontrada' });
    }

    if (updateData.creadaPor) {
      const profesionalExiste = await Professional.exists({ _id: updateData.creadaPor });
      if (!profesionalExiste) {
        return res.status(404).json({ error: 'Profesional no encontrado para creadaPor' });
      }
    }

    const nextAppointmentId = updateData.cita || existingNote.cita?.toString() || null;
    const citaError = await validarCitaVinculada(nextAppointmentId, existingNote.cliente);
    if (citaError) {
      return res.status(citaError.status).json({ error: citaError.error });
    }

    const previousAppointmentId = existingNote.cita?.toString() || null;
    const session = await TechnicalNote.startSession();
    let note = null;
    let appointmentUpdated = false;

    try {
      await session.withTransaction(async () => {
        note = await TechnicalNote.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true, session }
        );

        if (previousAppointmentId && previousAppointmentId !== nextAppointmentId) {
          appointmentUpdated = await limpiarNotaInternaDeCita(previousAppointmentId, session) || appointmentUpdated;
        }

        appointmentUpdated = await sincronizarNotaInternaDeCita(note, session) || appointmentUpdated;
      });
    } finally {
      await session.endSession();
    }

    await note.populate('creadaPor', 'nombre');
    await note.populate('cita', 'fechaHoraInicio fechaHoraFin estado');

    emitQuerySync('technicalNotes');
    if (appointmentUpdated) {
      emitQuerySync('appointments');
    }

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

    const existingNote = await TechnicalNote.findById(id).select('cita');

    if (!existingNote) {
      return res.status(404).json({ error: 'Nota tecnica no encontrada' });
    }

    const session = await TechnicalNote.startSession();
    let appointmentUpdated = false;

    try {
      await session.withTransaction(async () => {
        await TechnicalNote.findByIdAndDelete(id, { session });
        appointmentUpdated = await limpiarNotaInternaDeCita(existingNote.cita, session);
      });
    } finally {
      await session.endSession();
    }

    emitQuerySync('technicalNotes');
    if (appointmentUpdated) {
      emitQuerySync('appointments');
    }

    res.json({ message: 'Nota tecnica eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar nota tecnica:', error);
    res.status(500).json({ error: 'Error al eliminar la nota tecnica' });
  }
};
