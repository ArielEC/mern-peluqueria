import Appointment from '../models/Appointment.js';
import Blocker from '../models/Blocker.js';
import Professional from '../models/Professional.js';
import Service from '../models/Service.js';
import TechnicalNote from '../models/TechnicalNote.js';
import User from '../models/User.js';
import {
  verificarDisponibilidadSlot,
  encontrarProfesionalDisponible,
  calcularOcupacionOperativa,
  construirMensajeRedondeoDuracion
} from '../services/availability.service.js';
import { emitQuerySync } from '../services/querySync.service.js';
import { diferenciaDiasCeil, parsearFiltroFecha, resolverZonaHoraria } from '../utils/dateTime.js';

const MAX_REINTENTOS_TRANSACCION = 3;
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const ESTADOS_CITA_VALIDOS = new Set(['confirmada', 'completada', 'cancelada', 'no_presentado']);

const construirPoliticaDuracion = (ocupacion) => ({
  ...ocupacion,
  mensaje: construirMensajeRedondeoDuracion(ocupacion.duracionServicio, ocupacion.duracionSlot)
});

const construirPayloadError = (error, politicaDuracionFallback = null) => {
  const payload = {
    error: error.message || 'Error de reserva'
  };

  if (error.code) {
    payload.code = error.code;
  }

  if (error.razon) {
    payload.razon = error.razon;
  }

  if (error.politicaDuracion || politicaDuracionFallback) {
    payload.politicaDuracion = error.politicaDuracion || politicaDuracionFallback;
  }

  return payload;
};

const completarCitasPasadasConfirmadas = async (now = new Date()) => {
  await Appointment.updateMany(
    {
      estado: 'confirmada',
      fechaHoraFin: { $lte: now }
    },
    {
      $set: { estado: 'completada' }
    }
  );
};

const obtenerFinCita = (appointment) => (
  appointment?.fechaHoraFinOperativa || appointment?.fechaHoraFin || appointment?.fechaHoraInicio || null
);

const haFinalizadoCita = (appointment, now = new Date()) => {
  const fin = obtenerFinCita(appointment);

  if (!fin) {
    return false;
  }

  return new Date(fin) <= now;
};

const sincronizarNotaTecnicaVinculada = async (appointment, notasInternas, session) => {
  const contenido = typeof notasInternas === 'string' ? notasInternas.trim() : '';
  const notaVinculada = await TechnicalNote.findOne({ cita: appointment._id })
    .sort({ createdAt: -1 })
    .session(session);

  if (!contenido) {
    if (notaVinculada) {
      await TechnicalNote.deleteOne({ _id: notaVinculada._id }, { session });
      return true;
    }

    return false;
  }

  if (notaVinculada) {
    const haCambiado =
      notaVinculada.contenido !== contenido
      || notaVinculada.cliente?.toString() !== appointment.cliente?.toString();

    if (!haCambiado) {
      return false;
    }

    notaVinculada.contenido = contenido;
    notaVinculada.cliente = appointment.cliente;
    await notaVinculada.save({ session });
    return true;
  }

  const nuevaNota = new TechnicalNote({
    cliente: appointment.cliente,
    cita: appointment._id,
    contenido,
    categoria: 'otro'
  });

  await nuevaNota.save({ session });
  return true;
};

/**
 * GET /api/appointments
 * Listar citas - Cliente ve sus citas, Admin ve todas
 * Query params: desde, hasta, estado, profesionalId (admin), clienteId (admin)
 */
export const getAppointments = async (req, res) => {
  try {
    await completarCitasPasadasConfirmadas();

    const { desde, hasta, estado, profesionalId, clienteId } = req.query;
    const filter = {};

    // Si no es admin, solo puede ver sus propias citas
    if (req.user.role !== 'admin') {
      filter.cliente = req.user._id;
    } else {
      // Admin puede filtrar por cliente
      if (clienteId) {
        if (!OBJECT_ID_REGEX.test(clienteId)) {
          return res.status(400).json({ error: 'clienteId inválido' });
        }
        filter.cliente = clienteId;
      }
    }

    // Filtros comunes
    if (profesionalId) {
      if (!OBJECT_ID_REGEX.test(profesionalId)) {
        return res.status(400).json({ error: 'profesionalId inválido' });
      }
      filter.profesional = profesionalId;
    }
    if (estado) {
      if (typeof estado !== 'string' || !ESTADOS_CITA_VALIDOS.has(estado)) {
        return res.status(400).json({ error: 'estado inválido' });
      }
      filter.estado = estado;
    }
    if (desde || hasta) {
      // Usar TZ del negocio para interpretar fechas simples "YYYY-MM-DD" correctamente
      const tz = resolverZonaHoraria(req.settings);
      const desdeDate = desde ? parsearFiltroFecha(desde, false, tz) : null;
      const hastaDate = hasta ? parsearFiltroFecha(hasta, true, tz) : null;

      if (desde && !desdeDate) {
        return res.status(400).json({ error: 'Parámetro desde inválido' });
      }
      if (hasta && !hastaDate) {
        return res.status(400).json({ error: 'Parámetro hasta inválido' });
      }
      if (desdeDate && hastaDate && desdeDate > hastaDate) {
        return res.status(400).json({ error: 'El rango de fechas es inválido' });
      }

      filter.fechaHoraInicio = {};
      if (desdeDate) filter.fechaHoraInicio.$gte = desdeDate;
      if (hastaDate) filter.fechaHoraInicio.$lte = hastaDate;
    }

    const appointments = await Appointment.find(filter)
      .populate('cliente', 'nombre email telefono role')
      .populate('profesional', 'nombre color especialidad')
      .populate('servicio', 'nombre duracion precio')
      .sort({ fechaHoraInicio: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error al obtener citas:', error);

    res.status(500).json({ error: 'Error al obtener las citas' });
  }
};

/**
 * GET /api/appointments/:id
 * Obtener una cita específica
 */
export const getAppointmentById = async (req, res) => {
  try {
    await completarCitasPasadasConfirmadas();

    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('cliente', 'nombre email telefono role')
      .populate('profesional', 'nombre color especialidad')
      .populate('servicio', 'nombre duracion precio');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Verificar permisos: solo el cliente dueño o admin
    if (req.user.role !== 'admin' && appointment.cliente._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta cita' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ error: 'Error al obtener la cita' });
  }
};

/**
 * POST /api/appointments
 * Crear nueva cita con asignación automática de profesional.
 * Admin puede especificar clienteId para crear citas para terceros.
 */
export const createAppointment = async (req, res) => {
  let politicaDuracionContext = null;

  try {
    const { servicioId, fechaHoraInicio, clienteId, profesionalId, notasCliente, forceOverbook } = req.validatedBody;
    const fechaInicio = new Date(fechaHoraInicio);
    const esAdmin = req.user.role === 'admin';

    // Solo admin puede usar forceOverbook
    if (forceOverbook && !esAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden forzar overbooking' });
    }

    // Solo admin puede crear citas para un cliente tercero mediante clienteId
    if (clienteId && !esAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden especificar clienteId' });
    }

    if (esAdmin && !clienteId) {
      return res.status(400).json({
        error: 'clienteId es obligatorio para crear citas manuales desde administración'
      });
    }

    let clienteReservaId = req.user._id;

    if (clienteId) {
      const clienteObjetivo = await User.findById(clienteId)
        .select('_id role activo');

      if (!clienteObjetivo) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      if (clienteObjetivo.role !== 'cliente') {
        return res.status(400).json({ error: 'clienteId debe pertenecer a un usuario con rol cliente' });
      }

      if (!clienteObjetivo.activo) {
        return res.status(400).json({ error: 'El cliente especificado está desactivado' });
      }

      clienteReservaId = clienteObjetivo._id;
    }

    // Obtener servicio
    const servicio = await Service.findById(servicioId);
    if (!servicio || !servicio.activo) {
      return res.status(404).json({ error: 'Servicio no encontrado o no activo' });
    }

    // Settings ya cargado por el middleware loadSettings
    const settings = req.settings;
    const ahora = new Date();

    // Validar rango temporal: primero pasado, luego máximo de días (BUG-3)
    if (fechaInicio <= ahora) {
      return res.status(400).json({ error: 'No se puede reservar en el pasado' });
    }

    const diasHastaReserva = diferenciaDiasCeil(ahora, fechaInicio);
    const ocupacionServicio = calcularOcupacionOperativa(servicio.duracion, settings?.duracionSlot);
    const politicaDuracion = construirPoliticaDuracion(ocupacionServicio);
    politicaDuracionContext = politicaDuracion;

    if (diasHastaReserva > settings.diasMaximosReserva) {
      return res.status(400).json({
        error: `No se puede reservar con más de ${settings.diasMaximosReserva} días de antelación`
      });
    }

    // Calcular fecha fin
    const fechaFin = new Date(fechaInicio.getTime() + ocupacionServicio.duracionServicio * 60000);
    const fechaFinOperativa = new Date(fechaInicio.getTime() + ocupacionServicio.duracionOperativa * 60000);

    let profesionalAsignado = null;

    if (profesionalId) {
      const profesionalesCapaces = (servicio.profesionalesCapaces || []).map((id) => id.toString());

      if (profesionalesCapaces.length > 0 && !profesionalesCapaces.includes(profesionalId.toString())) {
        return res.status(400).json({
          error: 'El profesional no puede realizar este servicio',
          code: 'PROFESSIONAL_NOT_QUALIFIED'
        });
      }

      if (!forceOverbook) {
        const hayBloqueoGlobal = await Blocker.findOne({
          fechaHoraInicio: { $lt: fechaFinOperativa },
          fechaHoraFin: { $gt: fechaInicio },
          profesional: null
        }).select('_id');

        if (hayBloqueoGlobal) {
          return res.status(400).json({
            error: 'Existe un bloqueo global en este horario',
            code: 'GLOBAL_BLOCK_PRESENT',
            politicaDuracion
          });
        }
      }

      const profesionalObjetivo = await Professional.findById(profesionalId)
        .select('_id activo horarioSemanal');

      if (!profesionalObjetivo) {
        return res.status(404).json({
          error: 'Profesional no encontrado',
          code: 'PROFESSIONAL_NOT_FOUND'
        });
      }

      if (!profesionalObjetivo.activo) {
        return res.status(400).json({
          error: 'Profesional no activo',
          code: 'PROFESSIONAL_INACTIVE'
        });
      }
      // Verificar disponibilidad del profesional especificado
      const disponibilidad = await verificarDisponibilidadSlot(
        profesionalId,
        fechaInicio,
        servicio.duracion,
        null,
        { settings, profesional: profesionalObjetivo }
      );
      
      if (!disponibilidad.disponible && !forceOverbook) {
        const politicaRespuesta = disponibilidad.ocupacion
          ? construirPoliticaDuracion(disponibilidad.ocupacion)
          : politicaDuracion;

        return res.status(400).json({ 
          error: 'El profesional no está disponible en este horario',
          code: 'PROFESSIONAL_UNAVAILABLE',
          razon: disponibilidad.razon,
          politicaDuracion: politicaRespuesta
        });
      }
      
      profesionalAsignado = profesionalId;
    } else {
      // Asignación automática
      const profesional = await encontrarProfesionalDisponible(servicioId, fechaInicio, { settings });
      
      if (!profesional) {
        return res.status(400).json({
          error: 'No hay profesionales disponibles en este horario',
          code: 'NO_AVAILABLE_PROFESSIONALS',
          politicaDuracion
        });
      }
      
      profesionalAsignado = profesional._id;
    }

    // Crear la cita con control de concurrencia para evitar doble reserva
    const appointmentData = {
      cliente: clienteReservaId,
      profesional: profesionalAsignado,
      servicio: servicioId,
      fechaHoraInicio: fechaInicio,
      fechaHoraFin: fechaFin,
      fechaHoraFinOperativa: fechaFinOperativa,
      duracionOperativaMinutos: ocupacionServicio.duracionOperativa,
      precioFinal: servicio.precio,
      notasCliente: notasCliente || '',
      forzadaPorAdmin: forceOverbook || false,
      estado: 'confirmada'
    };

    let appointment = null;

    for (let intento = 1; intento <= MAX_REINTENTOS_TRANSACCION; intento++) {
      const session = await Appointment.startSession();

      try {
        await session.withTransaction(async () => {
          if (!forceOverbook) {
            // Bloqueo optimista por profesional para serializar reservas concurrentes
            const lockResult = await Professional.updateOne(
              { _id: profesionalAsignado, activo: true },
              { $inc: { __v: 1 } },
              { session }
            );

            if (!lockResult.matchedCount) {
              const error = new Error('El profesional no está disponible');
              error.status = 400;
              error.code = 'PROFESSIONAL_UNAVAILABLE';
              error.politicaDuracion = politicaDuracion;
              throw error;
            }

            // Revalidar cita solapada dentro de transacción
            const citaSolapada = await Appointment.findOne({
              profesional: profesionalAsignado,
              estado: 'confirmada',
              fechaHoraInicio: { $lt: fechaFinOperativa },
              $expr: {
                $gt: [
                  { $ifNull: ['$fechaHoraFinOperativa', '$fechaHoraFin'] },
                  fechaInicio
                ]
              }
            }).session(session);

            if (citaSolapada) {
              const error = new Error('El horario acaba de ocuparse por otra reserva');
              error.status = 409;
              error.code = 'SLOT_TAKEN';
              error.politicaDuracion = politicaDuracion;
              throw error;
            }

            // Revalidar bloqueos dentro de transacción
            const bloqueoSolapado = await Blocker.findOne({
              fechaHoraInicio: { $lt: fechaFinOperativa },
              fechaHoraFin: { $gt: fechaInicio },
              $or: [
                { profesional: profesionalAsignado },
                { profesional: null }
              ]
            }).session(session);

            if (bloqueoSolapado) {
              const error = new Error('Existe un bloqueo en este horario');
              error.status = 409;
              error.code = 'SLOT_BLOCKED';
              error.politicaDuracion = politicaDuracion;
              throw error;
            }
          }

          appointment = new Appointment(appointmentData);
          await appointment.save({ session });
        });

        await session.endSession();
        break;
      } catch (error) {
        await session.endSession();

        const esTransitorio =
          error?.errorLabels?.includes('TransientTransactionError') ||
          error?.codeName === 'WriteConflict';

        if (esTransitorio && intento < MAX_REINTENTOS_TRANSACCION) {
          continue;
        }

        throw error;
      }
    }

    if (!appointment) {
      return res.status(409).json({
        error: 'No se pudo completar la reserva por concurrencia',
        code: 'CONCURRENCY_RETRY_EXHAUSTED',
        politicaDuracion
      });
    }

    // Poblar referencias antes de devolver
    await appointment.populate('cliente', 'nombre email telefono role');
    await appointment.populate('profesional', 'nombre color especialidad');
    await appointment.populate('servicio', 'nombre duracion precio');

    const appointmentResponse = appointment.toObject();
    appointmentResponse.politicaDuracion = politicaDuracion;
    emitQuerySync('appointments');

    res.status(201).json(appointmentResponse);
  } catch (error) {
    console.error('Error al crear cita:', error);

    if (error.status) {
      return res.status(error.status).json(construirPayloadError(error, politicaDuracionContext));
    }

    res.status(500).json(construirPayloadError(
      { message: 'Error al crear la cita', code: 'APPOINTMENT_CREATE_INTERNAL_ERROR' },
      politicaDuracionContext
    ));
  }
};

/**
 * PUT /api/appointments/:id
 * Actualizar cita (solo admin)
 */
export const updateAppointment = async (req, res) => {
  try {
    await completarCitasPasadasConfirmadas();

    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const existingAppointment = await Appointment.findById(req.params.id);

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (req.validatedBody.estado) {
      const citaFinalizada = haFinalizadoCita(existingAppointment);
      const estadoSolicitado = req.validatedBody.estado;

      if (estadoSolicitado === 'cancelada') {
        return res.status(400).json({
          error: 'Para cancelar una cita usa la acción de cancelación'
        });
      }

      if (citaFinalizada && estadoSolicitado === 'completada' && existingAppointment.estado !== 'completada') {
        return res.status(400).json({
          error: 'La cita se marca como completada automáticamente al finalizar'
        });
      }

      if (
        citaFinalizada
        && estadoSolicitado !== 'no_presentado'
        && estadoSolicitado !== existingAppointment.estado
      ) {
        return res.status(400).json({
          error: 'Una cita finalizada solo puede marcarse manualmente como no presentado'
        });
      }

      if (!citaFinalizada && estadoSolicitado === 'no_presentado') {
        return res.status(400).json({
          error: 'No se puede marcar una cita futura como no presentado'
        });
      }

      if (!citaFinalizada && estadoSolicitado === 'completada') {
        return res.status(400).json({
          error: 'La cita solo puede completarse al finalizar'
        });
      }
    }

    const session = await Appointment.startSession();
    let appointment = null;
    let notasTecnicasActualizadas = false;

    try {
      await session.withTransaction(async () => {
        appointment = await Appointment.findByIdAndUpdate(
          req.params.id,
          { $set: req.validatedBody },
          { new: true, runValidators: true, session }
        );

        if (Object.prototype.hasOwnProperty.call(req.validatedBody, 'notasInternas')) {
          notasTecnicasActualizadas = await sincronizarNotaTecnicaVinculada(
            appointment,
            req.validatedBody.notasInternas,
            session
          );
        }
      });
    } finally {
      await session.endSession();
    }

    await appointment.populate('cliente', 'nombre email telefono role');
    await appointment.populate('profesional', 'nombre color especialidad');
    await appointment.populate('servicio', 'nombre duracion precio');

    emitQuerySync('appointments');
    if (notasTecnicasActualizadas) {
      emitQuerySync('technicalNotes');
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
};

/**
 * DELETE /api/appointments/:id
 * Cancelar cita con validación de horasMinimasCancelacion
 */
export const cancelAppointment = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Verificar permisos
    const esAdmin = req.user.role === 'admin';
    const esPropietario = appointment.cliente.toString() === req.user._id.toString();

    if (!esAdmin && !esPropietario) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita' });
    }

    // Verificar que no esté ya cancelada
    if (appointment.estado === 'cancelada') {
      return res.status(400).json({ error: 'La cita ya está cancelada' });
    }

    // Verificar que no sea pasada
    if (appointment.fechaHoraInicio <= new Date()) {
      return res.status(400).json({ error: 'No se puede cancelar una cita pasada' });
    }

    // Validar horasMinimasCancelacion (solo para clientes, admin puede cancelar siempre)
    if (!esAdmin) {
      const puedeCancel = appointment.puedeCancelar(req.settings.horasMinimasCancelacion);
      
      if (!puedeCancel) {
        return res.status(400).json({
          error: `No se puede cancelar con menos de ${req.settings.horasMinimasCancelacion} horas de antelación`
        });
      }
    }

    // Cancelar la cita
    appointment.estado = 'cancelada';
    appointment.canceladaPor = esAdmin ? 'admin' : 'cliente';
    appointment.motivoCancelacion = req.validatedBody.motivoCancelacion || '';
    
    await appointment.save();

    // Poblar referencias
    await appointment.populate('cliente', 'nombre email telefono role');
    await appointment.populate('profesional', 'nombre color especialidad');
    await appointment.populate('servicio', 'nombre duracion precio');

    emitQuerySync('appointments');
    res.json({ message: 'Cita cancelada correctamente', appointment });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
};
