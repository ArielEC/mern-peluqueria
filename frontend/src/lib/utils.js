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

export function formatIsoDateInTz(date, tz = 'Europe/Madrid') {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
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
