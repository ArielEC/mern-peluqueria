import { getDisponibilidad } from '../services/availability.service.js';

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

    // Parsear fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }

    // Verificar que la fecha no sea pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaDate < hoy) {
      return res.status(400).json({ error: 'No se puede consultar disponibilidad para fechas pasadas' });
    }

    const slots = await getDisponibilidad(fechaDate, servicioId, profesionalId || null);

    res.json({
      fecha: fecha,
      servicioId: servicioId,
      profesionalId: profesionalId || null,
      totalSlots: slots.length,
      slots: slots
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ error: error.message || 'Error al obtener disponibilidad' });
  }
};
