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


const metricas = {
  blockerFindCalls: 0,
  appointmentFindCalls: 0,
  blockerQuery: null,
  appointmentQuery: null
};

const resetMetricas = () => {
  metricas.blockerFindCalls = 0;
  metricas.appointmentFindCalls = 0;
  metricas.blockerQuery = null;
  metricas.appointmentQuery = null;
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

const configurarEscenario = ({ duracionSlot, servicio, profesional, citasDia, citaSolapada, capturarMetricas = false }) => {
  Service.findById = async (servicioId) => (
    String(servicioId) === String(servicio._id) ? servicio : null
  );

  Settings.getGlobal = async () => ({ duracionSlot });

  Professional.find = () => crearQueryMock([profesional]);

  Blocker.find = (query) => {
    if (capturarMetricas) {
      metricas.blockerFindCalls += 1;
      metricas.blockerQuery = query;
    }
    return crearQueryMock([]);
  };

  Appointment.find = (query) => {
    if (capturarMetricas) {
      metricas.appointmentFindCalls += 1;
      metricas.appointmentQuery = query;
    }
    return crearQueryMock(citasDia);
  };

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


const assertOptimizacionRango = ({ etiqueta, metricasEsperadas, profesionalesEsperados = [] }) => {
  assert.equal(metricas.blockerFindCalls, 1, `[${etiqueta}] Blocker.find debe ejecutarse una vez`);
  assert.equal(metricas.appointmentFindCalls, 1, `[${etiqueta}] Appointment.find debe ejecutarse una vez`);

  assert.ok(metricas.blockerQuery, `[${etiqueta}] blockerQuery no capturada`);
  assert.ok(metricas.appointmentQuery, `[${etiqueta}] appointmentQuery no capturada`);

  const bloqueoInicio = metricas.blockerQuery?.fechaHoraFin?.$gt;
  const bloqueoFin = metricas.blockerQuery?.fechaHoraInicio?.$lt;
  const citaInicio = metricas.appointmentQuery?.$or?.[0]?.fechaHoraFinOperativa?.$gt
    || metricas.appointmentQuery?.$or?.[1]?.fechaHoraFin?.$gt
    || metricas.appointmentQuery?.$or?.[2]?.fechaHoraFin?.$gt;
  const citaFin = metricas.appointmentQuery?.fechaHoraInicio?.$lt;

  assert.ok(bloqueoInicio instanceof Date, `[${etiqueta}] rango inicio bloqueos inválido`);
  assert.ok(bloqueoFin instanceof Date, `[${etiqueta}] rango fin bloqueos inválido`);
  assert.ok(citaInicio instanceof Date, `[${etiqueta}] rango inicio citas inválido`);
  assert.ok(citaFin instanceof Date, `[${etiqueta}] rango fin citas inválido`);

  assert.equal(bloqueoInicio.getHours(), metricasEsperadas.inicioHora, `[${etiqueta}] hora inicio bloqueos`);
  assert.equal(bloqueoInicio.getMinutes(), metricasEsperadas.inicioMinuto, `[${etiqueta}] minuto inicio bloqueos`);
  assert.equal(citaInicio.getHours(), metricasEsperadas.inicioHora, `[${etiqueta}] hora inicio citas`);
  assert.equal(citaInicio.getMinutes(), metricasEsperadas.inicioMinuto, `[${etiqueta}] minuto inicio citas`);

  assert.equal(bloqueoFin.getHours(), metricasEsperadas.finHora, `[${etiqueta}] hora fin bloqueos`);
  assert.equal(bloqueoFin.getMinutes(), metricasEsperadas.finMinuto, `[${etiqueta}] minuto fin bloqueos`);
  assert.equal(citaFin.getHours(), metricasEsperadas.finHora, `[${etiqueta}] hora fin citas`);
  assert.equal(citaFin.getMinutes(), metricasEsperadas.finMinuto, `[${etiqueta}] minuto fin citas`);

  const orBloqueos = metricas.blockerQuery?.$or || [];
  assert.equal(orBloqueos.length, 2, `[${etiqueta}] bloqueos debe incluir solo profesionales relevantes + globales`);

  const idsBloqueos = (orBloqueos[0]?.profesional?.$in || []).map((id) => String(id)).sort();
  const idsCitas = (metricas.appointmentQuery?.profesional?.$in || []).map((id) => String(id)).sort();
  const idsEsperados = profesionalesEsperados.map((id) => String(id)).sort();

  if (idsEsperados.length > 0) {
    assert.deepEqual(idsBloqueos, idsEsperados, `[${etiqueta}] $in de bloqueos debe contener solo profesionales activos del día`);
    assert.deepEqual(idsCitas, idsEsperados, `[${etiqueta}] $in de citas debe contener solo profesionales activos del día`);
  }

  const orCitas = metricas.appointmentQuery?.$or || [];
  assert.equal(orCitas.length, 3, `[${etiqueta}] citas debe cubrir fechaHoraFinOperativa y fallbacks por null/ausente`);
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


const casoOptimizacionRango = async () => {
  resetMetricas();

  const dia = fechaBase.getDay();

  const profesionalTemprano = crearProfesionalMock('Pro-rango-1', 'prof-rango-1');
  profesionalTemprano.horarioSemanal[dia] = {
    activo: true,
    inicio: '09:00',
    fin: '13:00'
  };

  const profesionalTarde = crearProfesionalMock('Pro-rango-2', 'prof-rango-2');
  profesionalTarde.horarioSemanal[dia] = {
    activo: true,
    inicio: '11:00',
    fin: '15:30'
  };

  const profesionalNoDisponible = crearProfesionalMock('Pro-rango-off', 'prof-rango-off');
  profesionalNoDisponible.horarioSemanal[dia] = { activo: false };

  const servicio = {
    _id: 'serv-rango',
    nombre: 'Servicio-rango',
    duracion: 50,
    precio: 25,
    profesionalesCapaces: [profesionalTemprano._id, profesionalTarde._id, profesionalNoDisponible._id],
    activo: true
  };

  const citaTemprana = {
    _id: 'cita-rango',
    profesional: profesionalTemprano._id,
    fechaHoraInicio: construirFecha(10, 0),
    fechaHoraFin: construirFecha(10, 50),
    fechaHoraFinOperativa: construirFecha(11, 0),
    estado: 'confirmada'
  };

  const citaLegacySinOperativa = {
    _id: 'cita-rango-legacy',
    profesional: profesionalTarde._id,
    fechaHoraInicio: construirFecha(12, 0),
    fechaHoraFin: construirFecha(12, 50),
    estado: 'confirmada'
  };

  Service.findById = async (servicioId) => (
    String(servicioId) === String(servicio._id) ? servicio : null
  );
  Settings.getGlobal = async () => ({ duracionSlot: 15 });

  Professional.find = () => crearQueryMock([profesionalTemprano, profesionalTarde, profesionalNoDisponible]);

  Blocker.find = (query) => {
    metricas.blockerFindCalls += 1;
    metricas.blockerQuery = query;
    return crearQueryMock([]);
  };

  Appointment.find = (query) => {
    metricas.appointmentFindCalls += 1;
    metricas.appointmentQuery = query;
    return crearQueryMock([citaTemprana, citaLegacySinOperativa]);
  };

  Blocker.hayBloqueo = async () => false;
  Appointment.findOne = async () => null;

  const disponibilidad = await getDisponibilidad(fechaBase, servicio._id, null);
  assert.ok(Array.isArray(disponibilidad.slots), '[rango] disponibilidad inválida');

  assertOptimizacionRango({
    etiqueta: 'rango',
    metricasEsperadas: {
      inicioHora: 9,
      inicioMinuto: 0,
      finHora: 15,
      finMinuto: 30
    },
    profesionalesEsperados: [profesionalTemprano._id, profesionalTarde._id]
  });

  const citasSinOperativa = (disponibilidad.slots || []).filter(
    (slot) => slot.profesionalId === profesionalTarde._id && slot.hora === '12:00'
  );
  assert.equal(citasSinOperativa.length, 0, '[rango] una cita legacy sin fechaHoraFinOperativa también debe bloquear por fechaHoraFin');
};

const casoSinProfesionalesActivosNoConsulta = async () => {
  resetMetricas();

  const dia = fechaBase.getDay();
  const profesionalOff = crearProfesionalMock('Pro-sin-dispo', 'prof-sin-dispo');
  profesionalOff.horarioSemanal[dia] = { activo: false };

  const servicio = {
    _id: 'serv-sin-dispo',
    nombre: 'Servicio-sin-dispo',
    duracion: 40,
    precio: 20,
    profesionalesCapaces: [profesionalOff._id],
    activo: true
  };

  Service.findById = async () => servicio;
  Settings.getGlobal = async () => ({ duracionSlot: 15 });
  Professional.find = () => crearQueryMock([profesionalOff]);

  Blocker.find = () => {
    metricas.blockerFindCalls += 1;
    return crearQueryMock([]);
  };

  Appointment.find = () => {
    metricas.appointmentFindCalls += 1;
    return crearQueryMock([]);
  };

  const disponibilidad = await getDisponibilidad(fechaBase, servicio._id, null);

  assert.deepEqual(disponibilidad.slots, [], '[sin-profesionales-activos] debe devolver slots vacíos');
  assert.equal(metricas.blockerFindCalls, 0, '[sin-profesionales-activos] no debe consultar bloqueos');
  assert.equal(metricas.appointmentFindCalls, 0, '[sin-profesionales-activos] no debe consultar citas');
};

const main = async () => {
  try {
    siguienteDiaLaboral();
    casoUnidad();

    await casoIntegracion(15, '50-15');
    await casoIntegracion(30, '50-30');
    await casoOptimizacionRango();
    await casoSinProfesionalesActivosNoConsulta();

    console.log('AB-05 OK: unidad e integración lógica (sin DB real) validadas.');
  } finally {
    restaurarMocks();
  }
};

main().catch((error) => {
  console.error('AB-05 FAIL:', error);
  process.exit(1);
});
