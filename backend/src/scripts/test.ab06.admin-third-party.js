import assert from 'node:assert/strict';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Professional from '../models/Professional.js';
import Settings from '../models/Settings.js';
import Blocker from '../models/Blocker.js';
import { createAppointment } from '../controllers/appointment.controller.js';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const FECHA_FUTURA = new Date(Date.now() + FORTY_EIGHT_HOURS_MS).toISOString();
const SERVICIO_ID = '507f1f77bcf86cd799439011';
const CLIENTE_ID_VALIDO = '507f191e810c19729de860ea';
const PROFESIONAL_ID_VALIDO = '507f1f77bcf86cd799439012';
const PROFESIONAL_INEXISTENTE_ID = '507f1f77bcf86cd799439099';
const ADMIN_ID_VALIDO = '507f1f77bcf86cd799439013';

const crearReq = ({ body = {}, user = {} } = {}) => ({
  body: {
    servicioId: SERVICIO_ID,
    fechaHoraInicio: FECHA_FUTURA,
    ...body
  },
  user: {
    _id: CLIENTE_ID_VALIDO,
    role: 'cliente',
    ...user
  }
});

const crearRes = () => {
  const state = {
    statusCode: 200,
    payload: null
  };

  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.payload = payload;
      return this;
    },
    get statusCode() {
      return state.statusCode;
    },
    get payload() {
      return state.payload;
    }
  };
};

const assertError = (res, statusCode, contains) => {
  assert.equal(res.statusCode, statusCode);
  assert.ok(res.payload?.error?.includes(contains), `Esperado error que incluya "${contains}" y se recibió: ${JSON.stringify(res.payload)}`);
};

const assertValidationErrorEnCampo = (res, campo) => {
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload?.error, 'Datos inválidos');
  assert.ok(Array.isArray(res.payload?.details), 'Se esperaban details de validación');

  const detalleCampo = res.payload.details.find((detail) =>
    Array.isArray(detail.path) && detail.path.includes(campo)
  );

  assert.ok(detalleCampo, `No se encontró detalle de validación para el campo "${campo}"`);
};

const crearHorarioSemanal24x7 = () => ({
  0: { activo: true, inicio: '00:00', fin: '23:59' },
  1: { activo: true, inicio: '00:00', fin: '23:59' },
  2: { activo: true, inicio: '00:00', fin: '23:59' },
  3: { activo: true, inicio: '00:00', fin: '23:59' },
  4: { activo: true, inicio: '00:00', fin: '23:59' },
  5: { activo: true, inicio: '00:00', fin: '23:59' },
  6: { activo: true, inicio: '00:00', fin: '23:59' }
});

const restaurarMetodos = (originales) => {
  User.findById = originales.userFindById;
  Service.findById = originales.serviceFindById;
  Professional.findById = originales.professionalFindById;
  Settings.getGlobal = originales.settingsGetGlobal;
  Blocker.hayBloqueo = originales.blockerHayBloqueo;
  Appointment.findOne = originales.appointmentFindOne;
  Appointment.startSession = originales.appointmentStartSession;
  Appointment.prototype.save = originales.appointmentPrototypeSave;
  Appointment.prototype.populate = originales.appointmentPrototypePopulate;
};

const main = async () => {
  const originales = {
    userFindById: User.findById,
    serviceFindById: Service.findById,
    professionalFindById: Professional.findById,
    settingsGetGlobal: Settings.getGlobal,
    blockerHayBloqueo: Blocker.hayBloqueo,
    appointmentFindOne: Appointment.findOne,
    appointmentStartSession: Appointment.startSession,
    appointmentPrototypeSave: Appointment.prototype.save,
    appointmentPrototypePopulate: Appointment.prototype.populate
  };

  try {
    // Caso 1: cliente no admin no puede enviar clienteId
    User.findById = () => {
      throw new Error('User.findById no debería ejecutarse en caso 1');
    };
    Service.findById = () => {
      throw new Error('Service.findById no debería ejecutarse en caso 1');
    };

    {
      const req = crearReq({
        body: { clienteId: CLIENTE_ID_VALIDO },
        user: { role: 'cliente' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 403, 'Solo administradores pueden especificar clienteId');
    }

    // Caso 2: admin con clienteId inválido
    User.findById = () => {
      throw new Error('User.findById no debería ejecutarse en caso 2');
    };
    Service.findById = () => {
      throw new Error('Service.findById no debería ejecutarse en caso 2');
    };

    {
      const req = crearReq({
        body: { clienteId: '123' },
        user: { role: 'admin' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertValidationErrorEnCampo(res, 'clienteId');
    }

    // Caso 3: admin con clienteId inexistente
    User.findById = () => ({
      select: async () => null
    });
    Service.findById = () => {
      throw new Error('Service.findById no debería ejecutarse en caso 3');
    };

    {
      const req = crearReq({
        body: { clienteId: CLIENTE_ID_VALIDO },
        user: { role: 'admin' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 404, 'Cliente no encontrado');
    }

    // Caso 4: admin con clienteId que no pertenece a rol cliente
    User.findById = () => ({
      select: async () => ({ _id: CLIENTE_ID_VALIDO, role: 'admin', activo: true })
    });
    Service.findById = () => {
      throw new Error('Service.findById no debería ejecutarse en caso 4');
    };

    {
      const req = crearReq({
        body: { clienteId: CLIENTE_ID_VALIDO },
        user: { role: 'admin' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 400, 'clienteId debe pertenecer a un usuario con rol cliente');
    }

    // Caso 5: admin con clienteId de cliente desactivado
    User.findById = () => ({
      select: async () => ({ _id: CLIENTE_ID_VALIDO, role: 'cliente', activo: false })
    });
    Service.findById = () => {
      throw new Error('Service.findById no debería ejecutarse en caso 5');
    };

    {
      const req = crearReq({
        body: { clienteId: CLIENTE_ID_VALIDO },
        user: { role: 'admin' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 400, 'El cliente especificado está desactivado');
    }

    // Caso 5b: admin con forceOverbook no puede usar profesional inexistente/inactivo
    User.findById = () => ({
      select: async () => ({ _id: CLIENTE_ID_VALIDO, role: 'cliente', activo: true })
    });
    Service.findById = async () => ({
      _id: SERVICIO_ID,
      activo: true,
      duracion: 50,
      precio: 30
    });
    Settings.getGlobal = async () => ({
      diasMaximosReserva: 30,
      duracionSlot: 15
    });
    Professional.findById = () => ({
      select: async () => null
    });

    {
      const req = crearReq({
        body: {
          clienteId: CLIENTE_ID_VALIDO,
          profesionalId: PROFESIONAL_INEXISTENTE_ID,
          forceOverbook: true
        },
        user: { role: 'admin' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 404, 'Profesional no encontrado o no activo');
    }

    // Caso 6: comportamiento previo para cliente autenticado sin clienteId
    User.findById = () => {
      throw new Error('User.findById no debería ejecutarse en caso 6');
    };
    Service.findById = async () => null;

    {
      const req = crearReq({
        user: { role: 'cliente' }
      });
      const res = crearRes();
      await createAppointment(req, res);
      assertError(res, 404, 'Servicio no encontrado o no activo');
    }

    // Caso 7: admin crea cita para tercero con clienteId válido (flujo exitoso)
    User.findById = () => ({
      select: async () => ({ _id: CLIENTE_ID_VALIDO, role: 'cliente', activo: true })
    });
    Service.findById = async () => ({
      _id: SERVICIO_ID,
      activo: true,
      duracion: 50,
      precio: 30
    });
    Settings.getGlobal = async () => ({
      diasMaximosReserva: 30,
      duracionSlot: 15
    });
    Professional.findById = () => ({
      select: async () => ({
        _id: PROFESIONAL_ID_VALIDO,
        activo: true,
        horarioSemanal: crearHorarioSemanal24x7()
      })
    });
    Blocker.hayBloqueo = async () => false;
    Appointment.findOne = async () => null;
    Appointment.startSession = async () => ({
      withTransaction: async (cb) => {
        await cb();
      },
      endSession: async () => {}
    });
    Appointment.prototype.save = async function() {
      return this;
    };
    Appointment.prototype.populate = async function() {
      return this;
    };

    {
      const req = crearReq({
        body: {
          clienteId: CLIENTE_ID_VALIDO,
          profesionalId: PROFESIONAL_ID_VALIDO,
          forceOverbook: true,
          notasCliente: 'Reserva gestionada por admin'
        },
        user: {
          _id: ADMIN_ID_VALIDO,
          role: 'admin'
        }
      });
      const res = crearRes();
      await createAppointment(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(String(res.payload?.cliente), CLIENTE_ID_VALIDO);
      assert.equal(String(res.payload?.profesional), PROFESIONAL_ID_VALIDO);
      assert.equal(res.payload?.forzadaPorAdmin, true);
      assert.ok(res.payload?.politicaDuracion, 'Se esperaba politicaDuracion en la respuesta');
    }

    console.log('AB-06 OK: permisos y consistencia de clienteId validados.');
  } finally {
    restaurarMetodos(originales);
  }
};

main().catch((error) => {
  console.error('AB-06 FAIL:', error);
  process.exit(1);
});
