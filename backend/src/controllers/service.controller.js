import Service from '../models/Service.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator.js';

/**
 * GET /api/services
 * Listar todos los servicios
 * Acceso: Público (para reservas) o Admin
 */
export const getAllServices = async (req, res) => {
  try {
    const { activo, categoria } = req.query;
    const filter = {};
    
    if (activo !== undefined) {
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
 * Acceso: Público o Admin
 */
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('profesionalesCapaces', 'nombre especialidad color');
    
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
    // Validar datos de entrada
    const validationResult = createServiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const service = new Service(validationResult.data);
    await service.save();
    
    // Poblar profesionales antes de devolver
    await service.populate('profesionalesCapaces', 'nombre especialidad color');
    
    res.status(201).json(service);
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
    // Validar datos de entrada
    const validationResult = updateServiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validationResult.error.errors 
      });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: validationResult.data },
      { new: true, runValidators: true }
    ).populate('profesionalesCapaces', 'nombre especialidad color');

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar el servicio' });
  }
};

/**
 * DELETE /api/services/:id
 * Eliminar un servicio (soft delete - desactivar)
 * Acceso: Solo Admin
 */
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false } },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ message: 'Servicio desactivado correctamente', service });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
};
