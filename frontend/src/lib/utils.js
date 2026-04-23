import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha (Date o ISO string) mostrando la hora en la zona horaria del negocio.
 * @param {Date|string} date
 * @param {string} tz - Zona horaria IANA del negocio (ej: "Europe/Madrid")
 * @param {object} options - Opciones adicionales de Intl.DateTimeFormat
 * @returns {string}
 */
export function formatInBusinessTz(date, tz = 'Europe/Madrid', options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    ...options,
  }).format(d);
}

/**
 * Devuelve solo "HH:mm" en la zona horaria del negocio.
 */
export function formatTimeInTz(date, tz = 'Europe/Madrid') {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Devuelve "d MMM yyyy" en la zona horaria del negocio.
 */
export function formatDateInTz(date, tz = 'Europe/Madrid') {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Devuelve fecha completa legible "miércoles, 15 de enero de 2025" en la TZ del negocio.
 */
export function formatFullDateInTz(date, tz = 'Europe/Madrid') {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
