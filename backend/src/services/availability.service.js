import Professional from '../models/Professional.js';
import Appointment from '../models/Appointment.js';
import Blocker from '../models/Blocker.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';

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
    const appointmentEnd = new Date(appointment.fechaHoraFin);
    // Hay solapamiento
    return slotStart < appointmentEnd && slotEnd > appointmentStart;
  });
};

/**
 * Obtiene la disponibilidad para una fecha y servicio específicos
 * @param {Date} fecha - Fecha para consultar disponibilidad
 * @param {String} servicioId - ID del servicio (para filtrar profesionales capaces y duración)
 * @param {String} profesionalId - (Opcional) ID de profesional específico
 * @returns {Array} Array de slots disponibles: [{hora: "HH:MM", profesionalId: ObjectId, profesionalNombre: String}]
 */
export const getDisponibilidad = async (fecha, servicioId, profesionalId = null) => {
  // Obtener servicio y configuración global para conocer duración real y grid de agenda
  const [servicio, settings] = await Promise.all([
    Service.findById(servicioId),
    Settings.getGlobal()
  ]);

  if (!servicio || !servicio.activo) {
    throw new Error('Servicio no encontrado o no activo');
  }

  const duracionSlot = resolverDuracionSlot(settings?.duracionSlot);
  const duracionServicio = servicio.duracion; // duración real en minutos
  const slotsNecesarios = Math.ceil(duracionServicio / duracionSlot); // ocupación en slots

  // Determinar qué día de la semana es (0 = Domingo, 1 = Lunes, etc.)
  const diaSemana = fecha.getDay();

  // Obtener profesionales que pueden realizar este servicio
  const profesionalesCapaces = (servicio.profesionalesCapaces || []).map((id) => id.toString());
  let filtro = { activo: true };
  if (profesionalId) {
    const profesionalIdStr = profesionalId.toString();

    // Si el servicio tiene lista explícita de profesionales capaces,
    // no se debe permitir consultar disponibilidad de profesionales no capaces.
    if (profesionalesCapaces.length > 0 && !profesionalesCapaces.includes(profesionalIdStr)) {
      return [];
    }

    filtro._id = profesionalId;
  } else if (profesionalesCapaces.length > 0) {
    filtro._id = { $in: servicio.profesionalesCapaces };
  }

  const profesionales = await Professional.find(filtro)
    .select('_id nombre color horarioSemanal')
    .lean();

  if (profesionales.length === 0) {
    return [];
  }

  // Definir rango del día para consultas
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  const profesionalesIds = profesionales.map((p) => p._id);

  // Obtener bloqueos del día solo para profesionales relevantes + globales
  const bloqueos = await Blocker.find({
    fechaHoraInicio: { $lt: finDia },
    fechaHoraFin: { $gt: inicioDia },
    $or: [
      { profesional: { $in: profesionalesIds } },
      { profesional: null },
      { profesional: { $exists: false } }
    ]
  })
    .select('_id profesional fechaHoraInicio fechaHoraFin')
    .lean();

  // Obtener citas confirmadas del día solo para profesionales relevantes
  const citas = await Appointment.find({
    fechaHoraInicio: { $lt: finDia },
    fechaHoraFin: { $gt: inicioDia },
    estado: 'confirmada',
    profesional: { $in: profesionalesIds }
  })
    .select('_id profesional fechaHoraInicio fechaHoraFin')
    .lean();

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

  for (const profesional of profesionales) {
    // Obtener horario del profesional para este día
    const horarioDia = profesional.horarioSemanal[diaSemana];
    
    if (!horarioDia || !horarioDia.activo) {
      continue; // El profesional no trabaja este día
    }

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

      // Crear fechas completas para el slot
      const slotStartDate = new Date(fecha);
      slotStartDate.setHours(Math.floor(slotInicio / 60), slotInicio % 60, 0, 0);
      
      const slotEndDate = new Date(fecha);
      slotEndDate.setHours(Math.floor(slotFinReal / 60), slotFinReal % 60, 0, 0);

      // Verificar que no esté en el pasado
      if (slotStartDate <= ahora) {
        continue;
      }

      // Verificar bloqueos
      if (estaBloqueado(slotStartDate, slotEndDate, bloqueosProf)) {
        continue;
      }

      // Verificar citas existentes
      if (tieneCita(slotStartDate, slotEndDate, citasProf)) {
        continue;
      }

      // El slot está disponible
      slotsDisponibles.push({
        hora: minutesToTime(slotInicio),
        horaFin: minutesToTime(slotFinReal),
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

  return slotsDisponibles;
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
  const fechaHoraFin = new Date(fechaHoraInicio.getTime() + duracion * 60000);

  // Permite inyectar entidades ya cargadas para evitar queries repetidas (N+1)
  const profesional = context.profesional || await Professional.findById(profesionalId);
  const settings = context.settings || await Settings.getGlobal();

  if (!profesional || !profesional.activo) {
    return { disponible: false, razon: 'Profesional no encontrado o no activo' };
  }

  const duracionSlot = resolverDuracionSlot(settings?.duracionSlot);

  const diaSemana = fechaHoraInicio.getDay();
  const horarioDia = profesional.horarioSemanal[diaSemana];

  if (!horarioDia || !horarioDia.activo) {
    return { disponible: false, razon: 'El profesional no trabaja este día' };
  }

  // Verificar que el slot esté dentro del horario laboral
  const minutosInicio = fechaHoraInicio.getHours() * 60 + fechaHoraInicio.getMinutes();
  const minutosFinReal = minutosInicio + duracion;
  const slotsNecesarios = Math.ceil(duracion / duracionSlot);
  const minutosFinAgenda = minutosInicio + (slotsNecesarios * duracionSlot);
  const horarioInicio = timeToMinutes(horarioDia.inicio);
  const horarioFin = timeToMinutes(horarioDia.fin);

  // El inicio debe respetar la rejilla configurada
  if ((minutosInicio - horarioInicio) % duracionSlot !== 0) {
    return {
      disponible: false,
      razon: `La hora de inicio debe alinearse al grid de ${duracionSlot} minutos`
    };
  }

  // Validamos contra el fin operativo de agenda (duración real redondeada a slots)
  if (minutosInicio < horarioInicio || minutosFinAgenda > horarioFin) {
    return { disponible: false, razon: 'Fuera del horario laboral del profesional' };
  }

  // Verificar descanso
  if (horarioDia.descansoInicio && horarioDia.descansoFin) {
    const descansoInicio = timeToMinutes(horarioDia.descansoInicio);
    const descansoFin = timeToMinutes(horarioDia.descansoFin);
    
    if (minutosInicio < descansoFin && minutosFinReal > descansoInicio) {
      return { disponible: false, razon: 'Coincide con el horario de descanso' };
    }
  }

  // Verificar bloqueos
  const hayBloqueo = await Blocker.hayBloqueo(profesionalId, fechaHoraInicio, fechaHoraFin);
  if (hayBloqueo) {
    return { disponible: false, razon: 'Existe un bloqueo en este horario' };
  }

  // Verificar citas existentes
  const filtrosCita = {
    profesional: profesionalId,
    estado: 'confirmada',
    fechaHoraInicio: { $lt: fechaHoraFin },
    fechaHoraFin: { $gt: fechaHoraInicio }
  };

  if (excludeAppointmentId) {
    filtrosCita._id = { $ne: excludeAppointmentId };
  }

  const citaExistente = await Appointment.findOne(filtrosCita);
  if (citaExistente) {
    return { disponible: false, razon: 'Ya existe una cita en este horario' };
  }

  return { disponible: true };
};

/**
 * Encuentra el primer profesional disponible para un servicio en un slot específico
 * @param {String} servicioId - ID del servicio
 * @param {Date} fechaHoraInicio - Fecha y hora deseada
 * @returns {Object|null} Profesional disponible o null
 */
export const encontrarProfesionalDisponible = async (servicioId, fechaHoraInicio) => {
  const [servicio, settings] = await Promise.all([
    Service.findById(servicioId).populate('profesionalesCapaces'),
    Settings.getGlobal()
  ]);

  if (!servicio || !servicio.activo) {
    return null;
  }

  const profesionales = servicio.profesionalesCapaces.length > 0 
    ? servicio.profesionalesCapaces 
    : await Professional.find({ activo: true });

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
      return profesional;
    }
  }

  return null;
};

export default {
  getDisponibilidad,
  verificarDisponibilidadSlot,
  encontrarProfesionalDisponible
};
