import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Timezone por defecto del negocio.
 * Se puede sobreescribir pasando la zona desde Settings.zonaHoraria.
 * Exportado para uso en virtuals de Mongoose que no tienen acceso a Settings.
 */
export const TIMEZONE_DEFAULT = 'Europe/Madrid';

/** Regex para detectar fechas simples "YYYY-MM-DD" */
const FECHA_SIMPLE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Devuelve la zona horaria a usar (la del negocio o el default).
 * @param {Object|null} settings - Objeto Settings de MongoDB
 * @returns {string}
 */
export const resolverZonaHoraria = (settings) => {
  return settings?.zonaHoraria || TIMEZONE_DEFAULT;
};

/**
 * Parsea una fecha en formato "YYYY-MM-DD" como medianoche en la zona horaria del negocio.
 * Soluciona el problema de new Date("YYYY-MM-DD") que crea UTC midnight,
 * lo que puede devolver el día incorrecto con .getDay() en zonas horarias West of UTC.
 *
 * @param {string} fechaStr - Fecha en formato "YYYY-MM-DD"
 * @param {string} tz - Zona horaria IANA (ej: "Europe/Madrid")
 * @returns {Date} - Objeto Date JavaScript equivalente a la medianoche local en esa TZ
 */
export const parseFechaLocal = (fechaStr, tz = TIMEZONE_DEFAULT) => {
  return dayjs.tz(fechaStr, 'YYYY-MM-DD', tz).toDate();
};

/**
 * Obtiene el día de la semana (0=Domingo … 6=Sábado) para una fecha
 * interpretada en la zona horaria del negocio.
 *
 * @param {Date} fecha - Objeto Date
 * @param {string} tz - Zona horaria IANA
 * @returns {number} 0-6
 */
export const getDiaSemana = (fecha, tz = TIMEZONE_DEFAULT) => {
  return dayjs(fecha).tz(tz).day();
};

/**
 * Construye una Date con hora y minuto exactos sobre una fecha base,
 * interpretando horas/minutos en la zona horaria del negocio.
 *
 * Reemplaza el patrón: new Date(base); base.setHours(h, m, 0, 0)
 * que usa la timezone local del servidor (incorrecta si no coincide con el negocio).
 *
 * @param {Date} fechaBase - Fecha base
 * @param {number} minutos - Minutos desde medianoche en TZ del negocio
 * @param {string} tz - Zona horaria IANA
 * @returns {Date}
 */
export const construirFechaEnTZ = (fechaBase, minutos, tz = TIMEZONE_DEFAULT) => {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  const base = dayjs(fechaBase).tz(tz);
  return base
    .hour(horas)
    .minute(mins)
    .second(0)
    .millisecond(0)
    .toDate();
};

/**
 * Extrae los minutos desde medianoche de una Date en la zona horaria del negocio.
 * Reemplaza: fechaHoraInicio.getHours() * 60 + fechaHoraInicio.getMinutes()
 *
 * @param {Date} fecha
 * @param {string} tz
 * @returns {number}
 */
export const getMinutosDesdeMedianoche = (fecha, tz = TIMEZONE_DEFAULT) => {
  const d = dayjs(fecha).tz(tz);
  return d.hour() * 60 + d.minute();
};

/**
 * Devuelve el inicio del día (medianoche) en la TZ del negocio como Date UTC.
 * Reemplaza: new Date(); hoy.setHours(0,0,0,0)
 *
 * @param {string} tz
 * @returns {Date}
 */
export const getInicioDelDiaHoy = (tz = TIMEZONE_DEFAULT) => {
  return dayjs().tz(tz).startOf('day').toDate();
};

/**
 * Indica si dos fechas corresponden al mismo día calendario en la TZ del negocio.
 *
 * @param {Date} a
 * @param {Date} b
 * @param {string} tz
 * @returns {boolean}
 */
export const esMismoDia = (a, b, tz = TIMEZONE_DEFAULT) => {
  return dayjs(a).tz(tz).isSame(dayjs(b).tz(tz), 'day');
};

/**
 * Parsea un string de fecha para filtros de rango de forma TZ-aware.
 * - Fecha simple "YYYY-MM-DD" → inicio o fin del día en la TZ del negocio.
 * - ISO datetime completo (con offset) → se parsea directamente.
 * Centraliza la lógica que antes estaba duplicada en appointment y blocker controllers.
 *
 * @param {string} value - String de fecha o datetime
 * @param {boolean} finDelDia - Si true, usa fin del día para fechas simples
 * @param {string} tz - Zona horaria IANA del negocio
 * @returns {Date|null}
 */
export const parsearFiltroFecha = (value, finDelDia = false, tz = TIMEZONE_DEFAULT) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  let d;
  if (FECHA_SIMPLE_REGEX.test(trimmed)) {
    d = finDelDia
      ? dayjs.tz(trimmed, 'YYYY-MM-DD', tz).endOf('day')
      : dayjs.tz(trimmed, 'YYYY-MM-DD', tz).startOf('day');
  } else {
    d = dayjs(trimmed);
  }

  if (!d.isValid()) return null;
  return d.toDate();
};

/**
 * Diferencia en horas entre dos fechas (b - a).
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export const diferenciaHoras = (a, b) => {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
};

/**
 * Diferencia en días enteros entre dos fechas (b - a), redondeando hacia arriba.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export const diferenciaDiasCeil = (a, b) => {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};
