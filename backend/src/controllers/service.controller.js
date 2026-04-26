import Service from '../models/Service.js';
import { emitQuerySync } from '../services/querySync.service.js';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const parseRequestedOrder = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.trunc(parsed));
};

const resequenceServiceOrders = async (orderedIds) => {
  if (!orderedIds.length) {
    return;
  }

  await Service.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { orden: index } },
      },
    }))
  );
};

const getOrderedServiceIds = async (excludeId = null) => {
  const filter = excludeId ? { _id: { $ne: excludeId } } : {};
  const services = await Service.find(filter)
    .sort({ orden: 1, nombre: 1, _id: 1 })
    .select('_id')
    .lean();

  return services.map((service) => service._id);
};

const buildOrderedIdsWithInsertion = (existingIds, targetId, requestedOrder) => {
  const insertIndex = requestedOrder === null
    ? existingIds.length
    : Math.min(requestedOrder, existingIds.length);

  return [
    ...existingIds.slice(0, insertIndex),
    targetId,
    ...existingIds.slice(insertIndex),
  ];
};

const getPopulatedServiceById = async (id) => Service.findById(id)
  .populate('profesionalesCapaces', 'nombre especialidad color');

/**
 * GET /api/services
 * Listar todos los servicios
 * Acceso: Publico (para reservas) o Admin
 */
export const getAllServices = async (req, res) => {
  try {
    const { activo, categoria } = req.query;
    const filter = {};

    if (activo !== undefined) {
      if (activo !== 'true' && activo !== 'false') {
        return res.status(400).json({ error: 'Parametro activo invalido (usa true/false)' });
      }
      filter.activo = activo === 'true';
    }

    if (categoria) {
      filter.categoria = categoria;
    }

    const services = await Service.find(filter)
      .populate('profesionalesCapaces', 'nombre especialidad color')
      .sort({ orden: 1, nombre: 1 });

    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener los servicios' });
  }
};

/**
 * GET /api/services/:id
 * Obtener un servicio por ID
 * Acceso: Publico o Admin
 */
export const getServiceById = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const service = await getPopulatedServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
};

/**
 * POST /api/services
 * Crear un nuevo servicio
 * Acceso: Solo Admin
 */
export const createService = async (req, res) => {
  try {
    const requestedOrder = parseRequestedOrder(req.validatedBody.orden);
    const service = new Service({ ...req.validatedBody, orden: 0 });
    await service.save();

    const existingIds = await getOrderedServiceIds(service._id);
    const orderedIds = buildOrderedIdsWithInsertion(existingIds, service._id, requestedOrder);
    await resequenceServiceOrders(orderedIds);

    const populatedService = await getPopulatedServiceById(service._id);

    emitQuerySync('services');
    res.status(201).json(populatedService);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear el servicio' });
  }
};

/**
 * PUT /api/services/:id
 * Actualizar un servicio
 * Acceso: Solo Admin
 */
export const updateService = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const requestedOrder = parseRequestedOrder(req.validatedBody.orden);
    const updateData = { ...req.validatedBody };
    delete updateData.orden;

    Object.assign(service, updateData);
    await service.save();

    if (requestedOrder !== null) {
      const existingIds = await getOrderedServiceIds(service._id);
      const orderedIds = buildOrderedIdsWithInsertion(existingIds, service._id, requestedOrder);
      await resequenceServiceOrders(orderedIds);
    }

    const populatedService = await getPopulatedServiceById(service._id);

    emitQuerySync('services');
    res.json(populatedService);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar el servicio' });
  }
};

/**
 * DELETE /api/services/:id
 * Eliminar un servicio de la base de datos permanentemente.
 * Acceso: Solo Admin
 */
export const deleteService = async (req, res) => {
  try {
    if (!OBJECT_ID_REGEX.test(req.params.id)) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const remainingIds = await getOrderedServiceIds();
    await resequenceServiceOrders(remainingIds);

    emitQuerySync('services');
    res.json({ message: 'Servicio eliminado correctamente', service });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
};
