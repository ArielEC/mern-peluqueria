import assert from 'node:assert/strict';
import Professional from '../models/Professional.js';
import Service from '../models/Service.js';
import Appointment from '../models/Appointment.js';
import Settings from '../models/Settings.js';
import Blocker from '../models/Blocker.js';
import {
  calcularOcupacionOperativa,
  construirMensajeRedondeoDuracion,
  getDisponibilidad,
  verificarDisponibilidadSlot
} from '../services/availability.service.js';

const now = new Date();
const fechaBase = new Date(now);
fechaBase.setDate(fechaBase.getDate() + 2);
fechaBase.setHours(0, 0, 0, 0);

const construirFecha = (hh, mm) => {
  const d = new Date(fechaBase);
  d.setHours(hh, mm, 0, 0);
  return d;
};

const siguienteDiaLaboral = () => {
  while ([0].includes(fechaBase.getDay())) {
    fechaBase.setDate(fechaBase.getDate() + 1);
  }
};

const crearHorarioSimple = () => {
  const plantilla = { activo: false };
  return {
    0: { ...plantilla },
    1: { ...plantilla },
    2: { ...plantilla },
    3: { ...plantilla },
    4: { ...plantilla },
    5: { ...plantilla },
    6: { ...plantilla }
  };
};

const crearProfesionalMock = (nombre, id) => {
  const dia = fechaBase.getDay();
  const horarioSemanal = crearHorarioSimple();
  horarioSemanal[dia] = {
    activo: true,
    inicio: '09:00',
    fin: '13:00'
  };

  return {
    _id: id,
    nombre,
    color: '#3B82F6',
    horarioSemanal,
    activo: true
  };
};

const crearQueryMock = (resultado) => ({
  select() {
    return this;
  },
  lean: async () => resultado
});

const originales = {
  serviceFindById: Service.findById,
  settingsGetGlobal: Settings.getGlobal,
  professionalFind: Professional.find,
  blockerFind: Blocker.find,
  blockerHayBloqueo: Blocker.hayBloqueo,
  appointmentFind: Appointment.find,
  appointmentFindOne: Appointment.findOne
};

const restaurarMocks = () => {
  Service.findById = originales.serviceFindById;
  Settings.getGlobal = originales.settingsGetGlobal;
  Professional.find = originales.professionalFind;
  Blocker.find = originales.blockerFind;
  Blocker.hayBloqueo = originales.blockerHayBloqueo;
  Appointment.find = originales.appointmentFind;
  Appointment.findOne = originales.appointmentFindOne;
};

const configurarEscenario = ({ duracionSlot, servicio, profesional, citasDia, citaSolapada }) => {
  Service.findById = async (servicioId) => (
    String(servicioId) === String(servicio._id) ? servicio : null
  );

  Settings.getGlobal = async () => ({ duracionSlot });

  Professional.find = () => crearQueryMock([profesional]);

  Blocker.find = () => crearQueryMock([]);

  Appointment.find = () => crearQueryMock(citasDia);

  Blocker.hayBloqueo = async () => false;

  Appointment.findOne = async (filtros) => {
    if (!citaSolapada) {
      return null;
    }

    const queryEnd = filtros?.fechaHoraInicio?.$lt;
    const expr = filtros?.$expr;
    const gtExpression = Array.isArray(expr?.$gt) ? expr.$gt : null;
    const queryStart = gtExpression ? gtExpression[1] : undefined;

    if (!queryStart || !queryEnd) {
      return citaSolapada;
    }

    const citaInicio = new Date(citaSolapada.fechaHoraInicio);
    const citaFin = new Date(citaSolapada.fechaHoraFinOperativa || citaSolapada.fechaHoraFin);

    const solapa = citaInicio < queryEnd && citaFin > queryStart;
    return solapa ? citaSolapada : null;
  };
};

const casoUnidad = () => {
  const casos = [
    {
      nombre: '50/15',
      duracionServicio: 50,
      duracionSlot: 15,
      esperado: { slotsNecesarios: 4, duracionOperativa: 60, redondeoAplicado: true }
    },
    {
      nombre: '50/30',
      duracionServicio: 50,
      duracionSlot: 30,
      esperado: { slotsNecesarios: 2, duracionOperativa: 60, redondeoAplicado: true }
    }
  ];

  for (const caso of casos) {
    const resultado = calcularOcupacionOperativa(caso.duracionServicio, caso.duracionSlot);
    assert.equal(resultado.slotsNecesarios, caso.esperado.slotsNecesarios, `[${caso.nombre}] slotsNecesarios`);
    assert.equal(resultado.duracionOperativa, caso.esperado.duracionOperativa, `[${caso.nombre}] duracionOperativa`);
    assert.equal(resultado.redondeoAplicado, caso.esperado.redondeoAplicado, `[${caso.nombre}] redondeoAplicado`);

    const mensaje = construirMensajeRedondeoDuracion(caso.duracionServicio, caso.duracionSlot);
    assert.match(mensaje, /Duración real: 50 min\./, `[${caso.nombre}] mensaje duración real`);
    assert.match(mensaje, /Ocupación operativa: 60 min/, `[${caso.nombre}] mensaje ocupación`);
  }
};

const casoIntegracion = async (duracionSlot, etiqueta) => {
  const profesional = crearProfesionalMock(`Pro-${etiqueta}`, `prof-${etiqueta}`);
  const servicio = {
    _id: `serv-${etiqueta}`,
    nombre: `Servicio-${etiqueta}`,
    duracion: 50,
    precio: 25,
    profesionalesCapaces: [profesional._id],
    activo: true
  };

  const fechaInicioReserva = construirFecha(10, 0);
  const fechaFinReal = new Date(fechaInicioReserva.getTime() + 50 * 60000);
  const fechaFinOperativa = new Date(fechaInicioReserva.getTime() + 60 * 60000);

  const citaExistente = {
    _id: `cita-${etiqueta}`,
    profesional: profesional._id,
    fechaHoraInicio: fechaInicioReserva,
    fechaHoraFin: fechaFinReal,
    fechaHoraFinOperativa: fechaFinOperativa,
    estado: 'confirmada'
  };

  configurarEscenario({
    duracionSlot,
    servicio,
    profesional,
    citasDia: [citaExistente],
    citaSolapada: citaExistente
  });

  const disponibilidad = await getDisponibilidad(fechaBase, servicio._id, profesional._id);
  assert.ok(disponibilidad.politicaDuracion, `[${etiqueta}] politicaDuracion faltante`);
  assert.equal(disponibilidad.politicaDuracion.duracionServicio, 50, `[${etiqueta}] duración real`);
  assert.equal(disponibilidad.politicaDuracion.duracionOperativa, 60, `[${etiqueta}] duración operativa`);

  const horas = disponibilidad.slots.map((slot) => slot.hora);
  assert.ok(!horas.includes('10:00'), `[${etiqueta}] 10:00 no debe estar disponible`);

  if (duracionSlot === 15) {
    assert.ok(!horas.includes('10:45'), `[${etiqueta}] 10:45 debe estar bloqueado por ocupación operativa`);
  }
  if (duracionSlot === 30) {
    assert.ok(!horas.includes('10:30'), `[${etiqueta}] 10:30 debe estar bloqueado por ocupación operativa`);
  }

  const validar1030 = await verificarDisponibilidadSlot(
    profesional._id,
    construirFecha(10, 30),
    50,
    null,
    { settings: { duracionSlot }, profesional }
  );

  assert.equal(validar1030.disponible, false, `[${etiqueta}] 10:30 debe ser indisponible`);
  assert.ok(validar1030.razon.includes('Duración real: 50 min.'), `[${etiqueta}] razón sin contexto`);
  assert.equal(validar1030.ocupacion.duracionOperativa, 60, `[${etiqueta}] ocupación en verificación`);
};

const main = async () => {
  try {
    siguienteDiaLaboral();
    casoUnidad();

    await casoIntegracion(15, '50-15');
    await casoIntegracion(30, '50-30');

    console.log('AB-05 OK: unidad e integración lógica (sin DB real) validadas.');
  } finally {
    restaurarMocks();
  }
};

main().catch((error) => {
  console.error('AB-05 FAIL:', error);
  process.exit(1);
});
