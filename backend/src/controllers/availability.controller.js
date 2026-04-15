import { getDisponibilidad } from '../services/availability.service.js';
import Settings from '../models/Settings.js';
import { parseFechaLocal, resolverZonaHoraria, getInicioDelDiaHoy } from '../utils/dateTime.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

/**
 * GET /api/availability
 * Obtener slots disponibles para una fecha y servicio
 * Query params: fecha (YYYY-MM-DD), servicioId, profesionalId (opcional)
 * Acceso: Público (para reservas)
 */
export const getAvailability = async (req, res) => {
  try {
    const { fecha, servicioId, profesionalId } = req.query;

    // Validar parámetros requeridos
    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida (formato: YYYY-MM-DD)' });
    }
    if (!servicioId) {
      return res.status(400).json({ error: 'El servicioId es requerido' });
    }

    if (!OBJECT_ID_REGEX.test(servicioId)) {
      return res.status(400).json({ error: 'servicioId inválido' });
    }

    if (profesionalId && !OBJECT_ID_REGEX.test(profesionalId)) {
      return res.status(400).json({ error: 'profesionalId inválido' });
    }

    // Obtener zona horaria del negocio desde Settings para parsear la fecha correctamente
    const settings = await Settings.getGlobal();
    const tz = resolverZonaHoraria(settings);

    // Parsear "YYYY-MM-DD" como medianoche en la TZ del negocio
    // (new Date("YYYY-MM-DD") crea UTC midnight, lo que produce el día incorrecto en TZ < UTC)
    const fechaDate = parseFechaLocal(fecha, tz);
    if (Number.isNaN(fechaDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }

    // Verificar que la fecha no sea pasada usando la TZ del negocio
    const hoy = getInicioDelDiaHoy(tz);
    if (fechaDate < hoy) {
      return res.status(400).json({ error: 'No se puede consultar disponibilidad para fechas pasadas' });
    }

    const disponibilidad = await getDisponibilidad(fechaDate, servicioId, profesionalId || null, settings);
    const slots = disponibilidad.slots || [];

    res.json({
      fecha: fecha,
      servicioId: servicioId,
      profesionalId: profesionalId || null,
      totalSlots: slots.length,
      slots: slots,
      politicaDuracion: disponibilidad.politicaDuracion
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);

    if (error.status) {
      return res.status(error.status).json({
        error: error.message || 'Error al obtener disponibilidad',
        code: error.code || 'AVAILABILITY_ERROR',
        politicaDuracion: error.politicaDuracion
      });
    }

    res.status(500).json({
      error: error.message || 'Error al obtener disponibilidad',
      code: 'AVAILABILITY_INTERNAL_ERROR'
    });
  }
};
