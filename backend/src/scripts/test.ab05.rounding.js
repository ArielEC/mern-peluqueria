import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Professional from '../models/Professional.js';
import Service from '../models/Service.js';
import Appointment from '../models/Appointment.js';
import Settings from '../models/Settings.js';
import {
  calcularOcupacionOperativa,
  construirMensajeRedondeoDuracion,
  getDisponibilidad,
  verificarDisponibilidadSlot
} from '../services/availability.service.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error('Define MONGO_URI o MONGODB_URI para ejecutar test:ab05');
}

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

const crearProfesional = async (nombre) => {
  const dia = fechaBase.getDay();
  const horarioSemanal = crearHorarioSimple();
  horarioSemanal[dia] = {
    activo: true,
    inicio: '09:00',
    fin: '13:00'
  };

  return Professional.create({
    nombre,
    especialidad: 'General',
    horarioSemanal,
    activo: true
  });
};

const limpiarColecciones = async () => {
  await Promise.all([
    Appointment.deleteMany({}),
    Service.deleteMany({}),
    Professional.deleteMany({}),
    Settings.deleteMany({ _id: 'global' })
  ]);
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
  await Settings.updateGlobal({ duracionSlot });

  const profesional = await crearProfesional(`Pro-${etiqueta}`);
  const settings = await Settings.getGlobal();
  const servicio = await Service.create({
    nombre: `Servicio-${etiqueta}`,
    duracion: 50,
    precio: 25,
    profesionalesCapaces: [profesional._id],
    activo: true
  });

  const fechaInicioReserva = construirFecha(10, 0);
  const fechaFinReal = new Date(fechaInicioReserva.getTime() + 50 * 60000);
  const fechaFinOperativa = new Date(fechaInicioReserva.getTime() + 60 * 60000);

  await Appointment.create({
    cliente: new mongoose.Types.ObjectId(),
    profesional: profesional._id,
    servicio: servicio._id,
    fechaHoraInicio: fechaInicioReserva,
    fechaHoraFin: fechaFinReal,
    fechaHoraFinOperativa: fechaFinOperativa,
    duracionOperativaMinutos: 60,
    precioFinal: 25,
    estado: 'confirmada'
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
    { settings, profesional }
  );

  assert.equal(validar1030.disponible, false, `[${etiqueta}] 10:30 debe ser indisponible`);
  assert.ok(validar1030.razon.includes('Duración real: 50 min.'), `[${etiqueta}] razón sin contexto`);
  assert.equal(validar1030.ocupacion.duracionOperativa, 60, `[${etiqueta}] ocupación en verificación`);
};

const main = async () => {
  await mongoose.connect(MONGO_URI);

  try {
    siguienteDiaLaboral();
    await limpiarColecciones();
    casoUnidad();

    await casoIntegracion(15, '50-15');
    await limpiarColecciones();

    await casoIntegracion(30, '50-30');
    console.log('AB-05 OK: unidad e integración (50/15 y 50/30) validadas.');
  } finally {
    await limpiarColecciones();
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('AB-05 FAIL:', error);
  process.exit(1);
});
