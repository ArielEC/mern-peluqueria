import Professional from '../models/Professional.js';
import Appointment from '../models/Appointment.js';
import Blocker from '../models/Blocker.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
import {
  resolverZonaHoraria,
  getDiaSemana,
  construirFechaEnTZ,
  getMinutosDesdeMedianoche
} from '../utils/dateTime.js';

/**
 * Servicio de disponibilidad
 * Genera slots disponibles para reservas usando el grid configurado en Settings
 */

/**
 * Convierte una hora en formato "HH:MM" a minutos desde medianoche
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convierte minutos desde medianoche a formato "HH:MM"
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Construye una fecha con hora/minuto exactos sobre una fecha base
 * usando la zona horaria del negocio (evita desfases UTC/local).
 * Se inyecta `tz` desde el contexto de llamada.
 */
const construirFechaDesdeMinutos = (fechaBase, minutos, tz) => {
  return construirFechaEnTZ(fechaBase, minutos, tz);
};

/**
 * Resuelve la duración del slot desde Settings.
 * Usa fallback seguro en caso de dato inválido.
 */
const resolverDuracionSlot = (duracionSlot) => {
  const valor = Number(duracionSlot);
  if (!Number.isInteger(valor) || valor <= 0) {
    return 15;
  }
  return Math.floor(valor);
};


/**
 * Obtiene rango horario válido de un día (en minutos) o null si no aplica.
 */
const obtenerRangoHorarioDia = (horarioDia) => {
  if (!horarioDia || !horarioDia.activo) {
    return null;
  }

  if (typeof horarioDia.inicio !== 'string' || typeof horarioDia.fin !== 'string') {
    return null;
  }

  const inicioMinutos = timeToMinutes(horarioDia.inicio);
  const finMinutos = timeToMinutes(horarioDia.fin);

  if (!Number.isFinite(inicioMinutos) || !Number.isFinite(finMinutos) || inicioMinutos >= finMinutos) {
    return null;
  }

  return { inicioMinutos, finMinutos };
};

const mapearCitaPorCompatibilidad = (cita) => {
  if (cita?.fechaHoraFinOperativa) {
    return cita;
  }

  return {
    ...cita,
    fechaHoraFinOperativa: cita?.fechaHoraFin || null
  };
};

/**
 * Calcula la ocupación operativa de agenda para un servicio.
 * La duración real del servicio se conserva, pero la ocupación en agenda
 * se redondea hacia arriba al múltiplo de slot más cercano.
 */
export const calcularOcupacionOperativa = (duracionServicio, duracionSlot) => {
  const duracionSlotResuelta = resolverDuracionSlot(duracionSlot);
  const duracionNormalizada = Number(duracionServicio);
  const duracionReal = Number.isFinite(duracionNormalizada) && duracionNormalizada > 0
    ? Math.ceil(duracionNormalizada)
    : duracionSlotResuelta;

  const slotsNecesarios = Math.ceil(duracionReal / duracionSlotResuelta);
  const duracionOperativa = slotsNecesarios * duracionSlotResuelta;

  return {
    duracionServicio: duracionReal,
    duracionSlot: duracionSlotResuelta,
    slotsNecesarios,
    duracionOperativa,
    redondeoAplicado: duracionOperativa !== duracionReal
  };
};

/**
 * Mensaje explicativo para la API sobre la política de duración.
 */
export const construirMensajeRedondeoDuracion = (duracionServicio, duracionSlot) => {
  const ocupacion = calcularOcupacionOperativa(duracionServicio, duracionSlot);
  const slotsLabel = ocupacion.slotsNecesarios === 1 ? 'slot' : 'slots';

  if (!ocupacion.redondeoAplicado) {
    return `Duración real y operativa: ${ocupacion.duracionServicio} min (${ocupacion.slotsNecesarios} ${slotsLabel} de ${ocupacion.duracionSlot} min).`;
  }

  return `Duración real: ${ocupacion.duracionServicio} min. Ocupación operativa: ${ocupacion.duracionOperativa} min (${ocupacion.slotsNecesarios} ${slotsLabel} de ${ocupacion.duracionSlot} min).`;
};

const crearErrorDisponibilidad = (message, status = 400, code = 'AVAILABILITY_ERROR', extra = {}) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
};

/**
 * Genera todos los slots para un día basado en el horario del profesional
 * @param {Object} horarioDia - Horario del día del profesional
 * @param {Number} duracionSlot - Duración del slot de agenda en minutos
 * @returns {Array} Array de slots en minutos desde medianoche
 */
const generarSlotsDelDia = (horarioDia, duracionSlot) => {
  if (!horarioDia || !horarioDia.activo) {
    return [];
  }

  const slots = [];
  const inicio = timeToMinutes(horarioDia.inicio);
  const fin = timeToMinutes(horarioDia.fin);
  const descansoInicio = horarioDia.descansoInicio ? timeToMinutes(horarioDia.descansoInicio) : null;
  const descansoFin = horarioDia.descansoFin ? timeToMinutes(horarioDia.descansoFin) : null;

  for (let minuto = inicio; minuto + duracionSlot <= fin; minuto += duracionSlot) {
    const slotFin = minuto + duracionSlot;

    // Saltar slots durante el descanso
    if (descansoInicio !== null && descansoFin !== null) {
      const solapaDescanso = minuto < descansoFin && slotFin > descansoInicio;
      if (solapaDescanso) {
        continue;
      }
    }
    slots.push(minuto);
  }

  return slots;
};

/**
 * Verifica si un slot está bloqueado por un blocker
 * @param {Date} slotStart - Inicio del slot
 * @param {Date} slotEnd - Fin del slot
 * @param {Array} blockers - Array de bloqueos activos
 * @returns {Boolean}
 */
const estaBloqueado = (slotStart, slotEnd, blockers) => {
  return blockers.some(blocker => {
    const blockerStart = new Date(blocker.fechaHoraInicio);
    const blockerEnd = new Date(blocker.fechaHoraFin);
    // Hay solapamiento si el slot empieza antes de que termine el bloqueo
    // y termina después de que empiece el bloqueo
    return slotStart < blockerEnd && slotEnd > blockerStart;
  });
};

/**
 * Verifica si un slot tiene cita existente
 * @param {Date} slotStart - Inicio del slot
 * @param {Date} slotEnd - Fin del slot
 * @param {Array} appointments - Array de citas del profesional
 * @returns {Boolean}
 */
const tieneCita = (slotStart, slotEnd, appointments) => {
  return appointments.some(appointment => {
    const appointmentStart = new Date(appointment.fechaHoraInicio);
    const appointmentEnd = new Date(appointment.fechaHoraFinOperativa || appointment.fechaHoraFin);
    // Hay solapamiento
    return slotStart < appointmentEnd && slotEnd > appointmentStart;
  });
};

/**
 * Obtiene la disponibilidad para una fecha y servicio específicos
 * @param {Date} fecha - Fecha para consultar disponibilidad (medianoche en TZ del negocio)
 * @param {String} servicioId - ID del servicio (para filtrar profesionales capaces y duración)
 * @param {String} profesionalId - (Opcional) ID de profesional específico
 * @param {Object} settingsCtx - (Opcional) Settings ya cargado para evitar query extra
 * @returns {Object} Objeto con slots disponibles y política de duración aplicada
 */
export const getDisponibilidad = async (fecha, servicioId, profesionalId = null, settingsCtx = null) => {
  // Obtener servicio y configuración global para conocer duración real y grid de agenda
  const [servicio, settings] = await Promise.all([
    Service.findById(servicioId),
    settingsCtx ? Promise.resolve(settingsCtx) : Settings.getGlobal()
  ]);

  if (!servicio || !servicio.activo) {
    throw crearErrorDisponibilidad('Servicio no encontrado o no activo', 404, 'SERVICE_NOT_AVAILABLE');
  }

  const duracionSlot = resolverDuracionSlot(settings?.duracionSlot);
  const ocupacionServicio = calcularOcupacionOperativa(servicio.duracion, duracionSlot);
  const { duracionServicio, slotsNecesarios, duracionOperativa } = ocupacionServicio;
  const politicaDuracion = {
    ...ocupacionServicio,
    mensaje: construirMensajeRedondeoDuracion(duracionServicio, duracionSlot)
  };

  // Zona horaria del negocio para todos los cálculos de fecha/hora
  const tz = resolverZonaHoraria(settings);

  // Determinar qué día de la semana es en la TZ del negocio (0 = Domingo, 1 = Lunes, etc.)
  const diaSemana = getDiaSemana(fecha, tz);

  // Obtener profesionales que pueden realizar este servicio
  const profesionalesCapaces = (servicio.profesionalesCapaces || []).map((id) => id.toString());
  let filtro = { activo: true };
  if (profesionalId) {
    const profesionalIdStr = profesionalId.toString();

    // Si el servicio tiene lista explícita de profesionales capaces,
    // no se debe permitir consultar disponibilidad de profesionales no capaces.
    if (profesionalesCapaces.length > 0 && !profesionalesCapaces.includes(profesionalIdStr)) {
      return { slots: [], politicaDuracion };
    }

    filtro._id = profesionalId;
  } else if (profesionalesCapaces.length > 0) {
    filtro._id = { $in: servicio.profesionalesCapaces };
  }

  const profesionales = await Professional.find(filtro)
    .select('_id nombre color horarioSemanal')
    .lean();

  if (profesionales.length === 0) {
    return { slots: [], politicaDuracion };
  }

  // Reducir carga de DB: filtrar primero profesionales con horario activo para el día.
  // Si nadie trabaja ese día, evitamos consultar bloqueos y citas.
  const profesionalesActivosDia = [];
  let inicioMinimoAgenda = null;
  let finMaximoAgenda = null;

  for (const profesional of profesionales) {
    const horarioDia = profesional.horarioSemanal?.[diaSemana];
    const rangoHorario = obtenerRangoHorarioDia(horarioDia);

    if (!rangoHorario) {
      continue;
    }

    const { inicioMinutos, finMinutos } = rangoHorario;

    profesionalesActivosDia.push(profesional);

    if (inicioMinimoAgenda === null || inicioMinutos < inicioMinimoAgenda) {
      inicioMinimoAgenda = inicioMinutos;
    }

    if (finMaximoAgenda === null || finMinutos > finMaximoAgenda) {
      finMaximoAgenda = finMinutos;
    }
  }

  if (
    profesionalesActivosDia.length === 0 ||
    inicioMinimoAgenda === null ||
    finMaximoAgenda === null
  ) {
    return { slots: [], politicaDuracion };
  }

  // Definir rango mínimo útil del día para reducir datos innecesarios en DB
  const inicioConsulta = construirFechaDesdeMinutos(fecha, inicioMinimoAgenda, tz);
  const finConsulta = construirFechaDesdeMinutos(fecha, finMaximoAgenda, tz);

  const profesionalesIds = profesionalesActivosDia.map((p) => p._id);

  // Obtener bloqueos y citas en paralelo para evitar latencia acumulada.
  // Ambos queries usan rango útil y profesionales relevantes.
  const [bloqueos, citasRaw] = await Promise.all([
    Blocker.find({
      fechaHoraInicio: { $lt: finConsulta },
      fechaHoraFin: { $gt: inicioConsulta },
      $or: [
        { profesional: { $in: profesionalesIds } },
        { profesional: null }
      ]
    })
      .select('_id profesional fechaHoraInicio fechaHoraFin')
      .lean(),
    // Se evita $expr para favorecer uso de índices y mantener compatibilidad
    // con documentos antiguos sin fechaHoraFinOperativa.
    Appointment.find({
      estado: 'confirmada',
      profesional: { $in: profesionalesIds },
      fechaHoraInicio: { $lt: finConsulta },
      $or: [
        { fechaHoraFinOperativa: { $gt: inicioConsulta } },
        { fechaHoraFinOperativa: null, fechaHoraFin: { $gt: inicioConsulta } },
        { fechaHoraFinOperativa: { $exists: false }, fechaHoraFin: { $gt: inicioConsulta } }
      ]
    })
      .select('_id profesional fechaHoraInicio fechaHoraFin fechaHoraFinOperativa')
      .lean()
  ]);

  const citas = citasRaw.map(mapearCitaPorCompatibilidad);

  // Indexar bloqueos por profesional para evitar filtros repetidos en cada iteración
  const bloqueosGlobales = [];
  const bloqueosPorProfesional = new Map();
  for (const bloqueo of bloqueos) {
    const profesionalBloqueo = bloqueo.profesional?.toString();
    if (!profesionalBloqueo) {
      bloqueosGlobales.push(bloqueo);
      continue;
    }

    const arr = bloqueosPorProfesional.get(profesionalBloqueo) || [];
    arr.push(bloqueo);
    bloqueosPorProfesional.set(profesionalBloqueo, arr);
  }

  // Indexar citas por profesional para evitar filtros repetidos en cada iteración
  const citasPorProfesional = new Map();
  for (const cita of citas) {
    const profesionalCita = cita.profesional.toString();
    const arr = citasPorProfesional.get(profesionalCita) || [];
    arr.push(cita);
    citasPorProfesional.set(profesionalCita, arr);
  }

  const slotsDisponibles = [];
  const ahora = new Date();

  for (const profesional of profesionalesActivosDia) {
    // Obtener horario del profesional para este día
    const horarioDia = profesional.horarioSemanal[diaSemana];

    // Generar slots del día para este profesional
    const slotsDelDia = generarSlotsDelDia(horarioDia, duracionSlot);

    const profesionalIdStr = profesional._id.toString();
    const bloqueosProf = [
      ...bloqueosGlobales,
      ...(bloqueosPorProfesional.get(profesionalIdStr) || [])
    ];
    const citasProf = citasPorProfesional.get(profesionalIdStr) || [];

    // Verificar cada slot
    for (let i = 0; i <= slotsDelDia.length - slotsNecesarios; i++) {
      const slotInicio = slotsDelDia[i];
      const slotFinReal = slotInicio + duracionServicio;
      const slotFinOperativo = slotInicio + duracionOperativa;

      // Verificar que todos los slots necesarios sean consecutivos
      let consecutivos = true;
      for (let j = 0; j < slotsNecesarios; j++) {
        if (slotsDelDia[i + j] !== slotInicio + (j * duracionSlot)) {
          consecutivos = false;
          break;
        }
      }

      if (!consecutivos) {
        continue;
      }

      // Crear fechas completas para el slot en la TZ del negocio
      const slotStartDate = construirFechaDesdeMinutos(fecha, slotInicio, tz);
      const slotEndDateOperativo = construirFechaDesdeMinutos(fecha, slotFinOperativo, tz);

      // Verificar que no esté en el pasado
      if (slotStartDate <= ahora) {
        continue;
      }

      // Verificar bloqueos
      if (estaBloqueado(slotStartDate, slotEndDateOperativo, bloqueosProf)) {
        continue;
      }

      // Verificar citas existentes
      if (tieneCita(slotStartDate, slotEndDateOperativo, citasProf)) {
        continue;
      }

      // El slot está disponible
      slotsDisponibles.push({
        hora: minutesToTime(slotInicio),
        horaFin: minutesToTime(slotFinReal),
        horaFinOperativa: minutesToTime(slotFinOperativo),
        profesionalId: profesional._id,
        profesionalNombre: profesional.nombre,
        profesionalColor: profesional.color
      });
    }
  }

  // Ordenar por hora y luego por profesional
  slotsDisponibles.sort((a, b) => {
    if (a.hora !== b.hora) {
      return a.hora.localeCompare(b.hora);
    }
    return a.profesionalNombre.localeCompare(b.profesionalNombre);
  });

  return {
    slots: slotsDisponibles,
    politicaDuracion
  };
};

/**
 * Verifica si un slot específico está disponible para un profesional
 * @param {String} profesionalId - ID del profesional
 * @param {Date} fechaHoraInicio - Fecha y hora de inicio
 * @param {Number} duracion - Duración en minutos
 * @param {String} excludeAppointmentId - (Opcional) ID de cita a excluir (para ediciones)
 * @returns {Boolean}
 */
export const verificarDisponibilidadSlot = async (
  profesionalId,
  fechaHoraInicio,
  duracion,
  excludeAppointmentId = null,
  context = {}
) => {
  // Permite inyectar entidades ya cargadas para evitar queries repetidas (N+1)
  const profesional = context.profesional || await Professional.findById(profesionalId);
  const settings = context.settings || await Settings.getGlobal();

  if (!profesional || !profesional.activo) {
    return { disponible: false, razon: 'Profesional no encontrado o no activo' };
  }

  const tz = resolverZonaHoraria(settings);
  const duracionSlot = resolverDuracionSlot(settings?.duracionSlot);
  const ocupacion = calcularOcupacionOperativa(duracion, duracionSlot);
  const mensajeOcupacion = construirMensajeRedondeoDuracion(ocupacion.duracionServicio, duracionSlot);
  const fechaHoraFinOperativa = new Date(
    fechaHoraInicio.getTime() + ocupacion.duracionOperativa * 60000
  );

  // Día de la semana en la TZ del negocio
  const diaSemana = getDiaSemana(fechaHoraInicio, tz);
  const horarioDia = profesional.horarioSemanal[diaSemana];

  if (!horarioDia || !horarioDia.activo) {
    return {
      disponible: false,
      razon: `El profesional no trabaja este día. ${mensajeOcupacion}`,
      ocupacion
    };
  }

  // Verificar que el slot esté dentro del horario laboral (usando TZ del negocio)
  const minutosInicio = getMinutosDesdeMedianoche(fechaHoraInicio, tz);
  const minutosFinAgenda = minutosInicio + ocupacion.duracionOperativa;
  const horarioInicio = timeToMinutes(horarioDia.inicio);
  const horarioFin = timeToMinutes(horarioDia.fin);

  // El inicio debe respetar la rejilla configurada
  if ((minutosInicio - horarioInicio) % duracionSlot !== 0) {
    return {
      disponible: false,
      razon: `La hora de inicio debe alinearse al grid de ${duracionSlot} minutos. ${mensajeOcupacion}`,
      ocupacion
    };
  }

  // Validamos contra el fin operativo de agenda (duración real redondeada a slots)
  if (minutosInicio < horarioInicio || minutosFinAgenda > horarioFin) {
    return {
      disponible: false,
      razon: `Fuera del horario laboral del profesional. ${mensajeOcupacion}`,
      ocupacion
    };
  }

  // Verificar descanso
  if (horarioDia.descansoInicio && horarioDia.descansoFin) {
    const descansoInicio = timeToMinutes(horarioDia.descansoInicio);
    const descansoFin = timeToMinutes(horarioDia.descansoFin);
    
    if (minutosInicio < descansoFin && minutosFinAgenda > descansoInicio) {
      return {
        disponible: false,
        razon: `Coincide con el horario de descanso. ${mensajeOcupacion}`,
        ocupacion
      };
    }
  }

  // Verificar bloqueos
  const hayBloqueo = await Blocker.hayBloqueo(profesionalId, fechaHoraInicio, fechaHoraFinOperativa);
  if (hayBloqueo) {
    return {
      disponible: false,
      razon: `Existe un bloqueo en este horario. ${mensajeOcupacion}`,
      ocupacion
    };
  }

  // Verificar citas existentes
  const filtrosCita = {
    profesional: profesionalId,
    estado: 'confirmada',
    fechaHoraInicio: { $lt: fechaHoraFinOperativa },
    $expr: {
      $gt: [
        { $ifNull: ['$fechaHoraFinOperativa', '$fechaHoraFin'] },
        fechaHoraInicio
      ]
    }
  };

  if (excludeAppointmentId) {
    filtrosCita._id = { $ne: excludeAppointmentId };
  }

  const citaExistente = await Appointment.findOne(filtrosCita);
  if (citaExistente) {
    return {
      disponible: false,
      razon: `Ya existe una cita en este horario. ${mensajeOcupacion}`,
      ocupacion
    };
  }

  return { disponible: true, ocupacion };
};

/**
 * Encuentra el profesional disponible con menor carga del día para un servicio.
 *
 * Criterio de asignación automática (determinista):
 * 1. Solo profesionales activos y capaces para el servicio.
 * 2. Se verifica disponibilidad en el slot solicitado.
 * 3. Entre los disponibles, se elige el que tenga MENOS citas confirmadas ese día.
 * 4. En caso de empate, se ordena alfabéticamente por nombre.
 * 5. Si sigue habiendo empate, se desempata por _id (estable e inmutable).
 *
 * @param {String} servicioId - ID del servicio
 * @param {Date} fechaHoraInicio - Fecha y hora deseada
 * @param {Object} context - Contexto opcional (settings)
 * @returns {Object|null} Profesional disponible o null
 */
export const encontrarProfesionalDisponible = async (servicioId, fechaHoraInicio, context = {}) => {
  const settingsPromise = context.settings
    ? Promise.resolve(context.settings)
    : Settings.getGlobal();

  const [servicio, settings] = await Promise.all([
    Service.findById(servicioId).populate('profesionalesCapaces'),
    settingsPromise
  ]);

  if (!servicio || !servicio.activo) {
    return null;
  }

  const profesionales = servicio.profesionalesCapaces.length > 0
    ? servicio.profesionalesCapaces
    : await Professional.find({ activo: true });

  // Calcular inicio y fin del día para contar carga
  const tz = resolverZonaHoraria(settings);
  const inicioDia = construirFechaEnTZ(fechaHoraInicio, 0, tz);
  const finDia = construirFechaEnTZ(fechaHoraInicio, 24 * 60 - 1, tz);

  // Obtener conteo de citas confirmadas por profesional para el día
  const profIds = profesionales.filter((p) => p.activo).map((p) => p._id);
  const citasDelDia = await Appointment.aggregate([
    {
      $match: {
        profesional: { $in: profIds },
        estado: 'confirmada',
        fechaHoraInicio: { $gte: inicioDia, $lte: finDia },
      },
    },
    { $group: { _id: '$profesional', count: { $sum: 1 } } },
  ]);
  const cargaPorProfesional = new Map();
  for (const { _id, count } of citasDelDia) {
    cargaPorProfesional.set(_id.toString(), count);
  }

  // Verificar disponibilidad y recoger candidatos
  const candidatos = [];
  for (const profesional of profesionales) {
    if (!profesional.activo) continue;

    const resultado = await verificarDisponibilidadSlot(
      profesional._id,
      fechaHoraInicio,
      servicio.duracion,
      null,
      { profesional, settings }
    );

    if (resultado.disponible) {
      candidatos.push({
        profesional,
        carga: cargaPorProfesional.get(profesional._id.toString()) || 0,
      });
    }
  }

  if (candidatos.length === 0) return null;

  // Ordenar: menor carga → alfabético por nombre → menor _id
  candidatos.sort((a, b) => {
    if (a.carga !== b.carga) return a.carga - b.carga;
    const nameCompare = a.profesional.nombre.localeCompare(b.profesional.nombre);
    if (nameCompare !== 0) return nameCompare;
    return a.profesional._id.toString().localeCompare(b.profesional._id.toString());
  });

  return candidatos[0].profesional;
};

export default {
  getDisponibilidad,
  verificarDisponibilidadSlot,
  encontrarProfesionalDisponible
};
