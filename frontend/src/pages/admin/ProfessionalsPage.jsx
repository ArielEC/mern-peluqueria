import { useMemo, useState } from 'react';
import {
  AdminPageHeader,
  AdminTable,
  ActionButtons,
  StatusToggle,
  ConfirmDeleteModal,
  AdminModal,
  FormField,
} from '@/components/admin/AdminTable';
import { inputCls } from '@/components/admin/adminFormStyles';
import {
  useAdminProfessionals,
  useAdminCreateProfessional,
  useAdminUpdateProfessional,
  useAdminDeleteProfessional,
} from '@/hooks/useAdminEntities';
import { useSettings } from '@/hooks/useSettings';
import { notifyValidationError } from '@/lib/notifications';

const DIAS = [
  { key: '1', label: 'Lun' },
  { key: '2', label: 'Mar' },
  { key: '3', label: 'Mie' },
  { key: '4', label: 'Jue' },
  { key: '5', label: 'Vie' },
  { key: '6', label: 'Sab' },
  { key: '0', label: 'Dom' },
];

function createEmptyDay() {
  return {
    activo: false,
    inicio: '09:00',
    fin: '18:00',
    descansoInicio: '',
    descansoFin: '',
  };
}

function normalizeHorarioSemanal(horario = {}) {
  return Object.fromEntries(
    DIAS.map(({ key }) => {
      const dia = horario?.[key] || {};

      return [key, {
        ...createEmptyDay(),
        ...dia,
        activo: dia.activo ?? false,
        inicio: dia.inicio || '09:00',
        fin: dia.fin || '18:00',
        descansoInicio: dia.descansoInicio || '',
        descansoFin: dia.descansoFin || '',
      }];
    })
  );
}

function serializeHorarioSemanal(horario = {}) {
  return Object.fromEntries(
    DIAS.map(({ key }) => {
      const dia = horario?.[key] || createEmptyDay();

      if (!dia.activo) {
        return [key, { activo: false }];
      }

      const serializedDay = {
        activo: true,
        inicio: dia.inicio || '09:00',
        fin: dia.fin || '18:00',
      };

      if (dia.descansoInicio && dia.descansoFin) {
        serializedDay.descansoInicio = dia.descansoInicio;
        serializedDay.descansoFin = dia.descansoFin;
      }

      return [key, serializedDay];
    })
  );
}

function splitTimeValue(value = '') {
  if (!value) {
    return { hour: '', minute: '' };
  }

  const [hour = '', minute = ''] = value.split(':');
  return { hour, minute };
}

function buildTimeValue(hour = '', minute = '') {
  if (!hour || !minute) return '';
  return `${hour}:${minute}`;
}

function buildHourOptions(currentHour = '') {
  const options = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));

  if (currentHour && !options.includes(currentHour)) {
    options.push(currentHour);
    options.sort((left, right) => Number(left) - Number(right));
  }

  return options;
}

function timeToMinutes(time = '') {
  const [hours, minutes] = time.split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

function minutesToTimeValue(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min((24 * 60) - 1, totalMinutes));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildTimesWithinRange({ slotDurationMinutes = 15, minExclusive, maxExclusive, includeValues = [] }) {
  const safeStep = Math.max(1, Number(slotDurationMinutes) || 15);
  const minMinutes = minExclusive ? timeToMinutes(minExclusive) : null;
  const maxMinutes = maxExclusive ? timeToMinutes(maxExclusive) : null;
  const timeSet = new Set();

  for (let minute = 0; minute < 24 * 60; minute += safeStep) {
    if (minMinutes !== null && minute <= minMinutes) continue;
    if (maxMinutes !== null && minute >= maxMinutes) continue;
    timeSet.add(minutesToTimeValue(minute));
  }

  includeValues
    .filter(Boolean)
    .forEach((value) => timeSet.add(value));

  return Array.from(timeSet).sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
}

function buildHourOptionsFromTimes(times = [], currentHour = '') {
  const hourSet = new Set(
    times
      .map((time) => splitTimeValue(time).hour)
      .filter(Boolean)
  );

  if (currentHour) {
    hourSet.add(currentHour);
  }

  return Array.from(hourSet).sort((left, right) => Number(left) - Number(right));
}

function buildMinuteOptionsFromTimes(times = [], hour = '', currentMinute = '') {
  const minuteSet = new Set(
    times
      .filter((time) => splitTimeValue(time).hour === hour)
      .map((time) => splitTimeValue(time).minute)
      .filter(Boolean)
  );

  if (currentMinute) {
    minuteSet.add(currentMinute);
  }

  return Array.from(minuteSet).sort((left, right) => Number(left) - Number(right));
}

function normalizeBreakTimesForDay(day, slotDurationMinutes) {
  const nextDay = { ...day };
  const validBreakStartTimes = buildTimesWithinRange({
    slotDurationMinutes,
    minExclusive: nextDay.inicio,
    maxExclusive: nextDay.fin,
  });

  if (nextDay.descansoInicio && !validBreakStartTimes.includes(nextDay.descansoInicio)) {
    nextDay.descansoInicio = '';
    nextDay.descansoFin = '';
    return nextDay;
  }

  if (!nextDay.descansoInicio) {
    nextDay.descansoFin = '';
    return nextDay;
  }

  const validBreakEndTimes = buildTimesWithinRange({
    slotDurationMinutes,
    minExclusive: nextDay.descansoInicio,
    maxExclusive: nextDay.fin,
  });

  if (nextDay.descansoFin && !validBreakEndTimes.includes(nextDay.descansoFin)) {
    nextDay.descansoFin = '';
  }

  return nextDay;
}

function buildMinuteOptions(stepMinutes = 15, currentMinute = '') {
  const safeStep = Math.max(1, Number(stepMinutes) || 15);
  const options = [];

  for (let minute = 0; minute < 60; minute += safeStep) {
    options.push(String(minute).padStart(2, '0'));
  }

  if (currentMinute && !options.includes(currentMinute)) {
    options.push(currentMinute);
    options.sort((left, right) => Number(left) - Number(right));
  }

  return options;
}

const EMPTY_HORARIO = normalizeHorarioSemanal();
const EMPTY_FORM = {
  nombre: '',
  especialidad: '',
  color: '#6b38d4',
  activo: true,
  horarioSemanal: EMPTY_HORARIO,
};
const PRESET_COLORS = ['#6b38d4', '#665396', '#855000', '#0059c0', '#006e1c', '#ba1a1a', '#006874'];

const timeSelectCls = 'w-full appearance-none rounded-lg bg-[#f2f3ff] px-2.5 py-2 text-[0.82rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4] disabled:opacity-60';

function TimeSelectBlock({
  label,
  value,
  onChange,
  slotDurationMinutes,
  allowEmpty = false,
  allowedTimes = null,
}) {
  const { hour, minute } = splitTimeValue(value);
  const constrainedTimes = Array.isArray(allowedTimes) ? allowedTimes : null;
  const hourOptions = constrainedTimes
    ? buildHourOptionsFromTimes(constrainedTimes, hour)
    : buildHourOptions(hour);
  const minuteOptions = constrainedTimes
    ? buildMinuteOptionsFromTimes(constrainedTimes, hour, minute)
    : buildMinuteOptions(slotDurationMinutes, minute);
  const defaultMinuteOption = buildMinuteOptions(slotDurationMinutes)[0] || '00';

  return (
    <div className="flex flex-col items-center gap-1.5 lg:items-start">
      <span className="text-center text-[0.68rem] font-bold uppercase tracking-wider text-[#494454] lg:text-left">{label}</span>
      <div className="mx-auto grid max-w-[11rem] grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-center text-[0.62rem] font-bold uppercase tracking-wide text-[#81768f]">Hora</span>
          <select
            value={hour}
            onChange={(event) => {
              const nextHour = event.target.value;

              if (!nextHour) {
                if (allowEmpty) {
                  onChange('');
                }
                return;
              }

              const nextMinuteOptions = constrainedTimes
                ? buildMinuteOptionsFromTimes(constrainedTimes, nextHour, minute)
                : buildMinuteOptions(slotDurationMinutes, minute);
              const nextMinute = nextMinuteOptions.includes(minute)
                ? minute
                : (nextMinuteOptions[0] || defaultMinuteOption);

              if (!nextMinute) {
                if (allowEmpty) {
                  onChange('');
                }
                return;
              }

              onChange(buildTimeValue(nextHour, nextMinute));
            }}
            className={timeSelectCls}
          >
            {allowEmpty ? <option value="">--</option> : null}
            {hourOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-center text-[0.62rem] font-bold uppercase tracking-wide text-[#81768f]">Minutos</span>
          <select
            value={minute}
            onChange={(event) => {
              const nextMinute = event.target.value;

              if (!nextMinute) {
                if (allowEmpty) {
                  onChange('');
                }
                return;
              }

              if (!hour) {
                return;
              }

              onChange(buildTimeValue(hour, nextMinute));
            }}
            disabled={allowEmpty && !hour}
            className={timeSelectCls}
          >
            {allowEmpty ? <option value="">--</option> : null}
            {minuteOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function HorarioEditor({ horario, onChange, error, slotDurationMinutes }) {
  function setDia(key, field, value) {
    const currentDay = horario[key] || createEmptyDay();
    const nextDay = normalizeBreakTimesForDay({
      ...currentDay,
      [field]: value,
    }, slotDurationMinutes);

    onChange({
      ...horario,
      [key]: nextDay,
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-[#ffdad6] px-4 py-3 text-[0.8rem] font-medium text-[#93000a]">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-[#f8f7ff] px-4 py-3 text-center text-[0.76rem] text-[#494454] lg:text-left">
        Los minutos siguen el slot configurado del negocio: {buildMinuteOptions(slotDurationMinutes).join(', ')}.
      </div>

      {DIAS.map(({ key, label }) => {
        const dia = horario[key] || createEmptyDay();
        const breakStartAllowedTimes = buildTimesWithinRange({
          slotDurationMinutes,
          minExclusive: dia.inicio,
          maxExclusive: dia.descansoFin || dia.fin,
          includeValues: [dia.descansoInicio],
        });
        const breakEndAllowedTimes = buildTimesWithinRange({
          slotDurationMinutes,
          minExclusive: dia.descansoInicio || dia.inicio,
          maxExclusive: dia.fin,
          includeValues: [dia.descansoFin],
        });

        return (
          <div
            key={key}
            className={`rounded-xl border p-3 transition-colors ${dia.activo
              ? 'border-[#cbc3d7]/30 bg-white shadow-[0_12px_30px_-22px_rgba(19,27,46,0.28)]'
              : 'border-[#cbc3d7]/20 bg-[#faf8ff]'
              }`}
          >
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start">
              <label className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 lg:w-20 lg:justify-start">
                <input
                  type="checkbox"
                  checked={dia.activo}
                  onChange={(event) => setDia(key, 'activo', event.target.checked)}
                  className="h-4 w-4 rounded accent-[#6b38d4]"
                />
                <span className={`text-[0.8rem] font-bold ${dia.activo ? 'text-[#131b2e]' : 'text-[#cbc3d7]'}`}>
                  {label}
                </span>
              </label>

              {dia.activo ? (
                <div className="flex w-full flex-1 flex-col items-center space-y-3 lg:items-stretch">
                  <div className="grid w-full justify-items-center gap-3 lg:grid-cols-2 lg:justify-items-stretch">
                    <TimeSelectBlock
                      label="Inicio jornada"
                      value={dia.inicio}
                      onChange={(value) => setDia(key, 'inicio', value)}
                      slotDurationMinutes={slotDurationMinutes}
                    />
                    <TimeSelectBlock
                      label="Fin jornada"
                      value={dia.fin}
                      onChange={(value) => setDia(key, 'fin', value)}
                      slotDurationMinutes={slotDurationMinutes}
                    />
                  </div>

                  <div className="w-full rounded-xl bg-[#faf9ff] p-3">
                    <div className="mb-2 flex flex-col items-center justify-between gap-3 lg:flex-row">
                      <span className="text-center text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#81768f] lg:text-left">
                        Descanso opcional
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange({
                          ...horario,
                          [key]: {
                            ...dia,
                            descansoInicio: '',
                            descansoFin: '',
                          },
                        })}
                        className="rounded-lg border border-[#cbc3d7]/35 px-3 py-1.5 text-[0.72rem] font-bold text-[#494454] transition-colors hover:bg-white"
                      >
                        Sin descanso
                      </button>
                    </div>
                    <div className="grid w-full justify-items-center gap-3 lg:grid-cols-2 lg:justify-items-stretch">
                      <TimeSelectBlock
                        label="Inicio descanso"
                        value={dia.descansoInicio}
                        onChange={(value) => setDia(key, 'descansoInicio', value)}
                        slotDurationMinutes={slotDurationMinutes}
                        allowEmpty
                        allowedTimes={breakStartAllowedTimes}
                      />
                      <TimeSelectBlock
                        label="Fin descanso"
                        value={dia.descansoFin}
                        onChange={(value) => setDia(key, 'descansoFin', value)}
                        slotDurationMinutes={slotDurationMinutes}
                        allowEmpty
                        allowedTimes={breakEndAllowedTimes}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-center text-[0.75rem] italic text-[#cbc3d7]">No trabaja</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfModal({ open, onClose, initial }) {
  const createMut = useAdminCreateProfessional();
  const updateMut = useAdminUpdateProfessional();
  const { data: settings } = useSettings();
  const isEdit = Boolean(initial?._id);
  const slotDurationMinutes = Number(settings?.duracionSlot) || 15;

  const [form, setForm] = useState(() => (initial ? {
    nombre: initial.nombre || '',
    especialidad: initial.especialidad || '',
    color: initial.color || '#6b38d4',
    activo: initial.activo !== false,
    horarioSemanal: normalizeHorarioSemanal(initial.horarioSemanal),
  } : {
    ...EMPTY_FORM,
    horarioSemanal: normalizeHorarioSemanal(),
  }));
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('info');

  if (!open) return null;

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.nombre.trim()) nextErrors.nombre = 'Nombre obligatorio';
    if (!form.especialidad.trim()) nextErrors.especialidad = 'Especialidad obligatoria';
    if (!form.color.match(/^#[0-9a-fA-F]{6}$/)) nextErrors.color = 'Color invalido';

    for (const { key, label } of DIAS) {
      const dia = form.horarioSemanal?.[key];

      if (!dia?.activo) continue;

      if (!dia.inicio || !dia.fin) {
        nextErrors.horarioSemanal = `Completa la jornada de ${label}`;
        break;
      }

      if (dia.fin <= dia.inicio) {
        nextErrors.horarioSemanal = `La jornada de ${label} no es valida`;
        break;
      }

      const hasBreakStart = Boolean(dia.descansoInicio);
      const hasBreakEnd = Boolean(dia.descansoFin);

      if (hasBreakStart !== hasBreakEnd) {
        nextErrors.horarioSemanal = `Completa el descanso de ${label} o dejalo vacio`;
        break;
      }

      if (hasBreakStart && hasBreakEnd) {
        if (dia.descansoFin <= dia.descansoInicio) {
          nextErrors.horarioSemanal = `El descanso de ${label} no es valido`;
          break;
        }

        if (dia.descansoInicio <= dia.inicio || dia.descansoFin >= dia.fin) {
          nextErrors.horarioSemanal = `El descanso de ${label} debe quedar dentro de la jornada`;
          break;
        }
      }
    }

    return nextErrors;
  }

  function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setTab(nextErrors.horarioSemanal ? 'horario' : 'info');
      notifyValidationError(nextErrors, 'Revisa los datos del profesional');
      return;
    }

    const payload = {
      ...form,
      horarioSemanal: serializeHorarioSemanal(form.horarioSemanal),
    };
    const mutation = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, ...payload } : payload;

    mutation.mutate(args, {
      onSuccess: onClose,
      onError: (error) => setErrors({
        api: error?.response?.data?.error || 'Error',
      }),
    });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Profesional' : 'Nuevo Profesional'}
      subtitle={isEdit ? form.nombre : 'Anade un miembro al equipo'}
      footer={(
        <>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#cbc3d7]/40 py-3 text-[0.875rem] font-bold text-[#494454] hover:bg-[#f2f3ff]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex flex-1 items-center justify-center rounded-lg bg-[#6b38d4] py-3 text-[0.875rem] font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            {isPending
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
              : (isEdit ? 'Guardar cambios' : 'Crear profesional')}
          </button>
        </>
      )}
    >
      <div className="mb-5 flex gap-1 rounded-lg bg-[#f2f3ff] p-1">
        {[
          ['info', 'person', 'Informacion'],
          ['horario', 'schedule', 'Horario'],
        ].map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md py-2 text-[0.8rem] font-bold transition-all ${tab === key ? 'bg-white text-[#6b38d4] shadow-sm' : 'text-[#494454]'
              }`}
          >
            <span className="material-symbols-outlined mr-1.5 text-[16px] align-[-3px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <FormField label="Nombre" error={errors.nombre} required>
            <input
              className={inputCls}
              value={form.nombre}
              onChange={(event) => set('nombre', event.target.value)}
              placeholder="Nombre completo"
            />
          </FormField>

          <FormField label="Especialidad" error={errors.especialidad} required>
            <input
              className={inputCls}
              value={form.especialidad}
              onChange={(event) => set('especialidad', event.target.value)}
              placeholder="Ej: Colorista, Barbero..."
            />
          </FormField>

          <FormField label="Color identificativo" error={errors.color}>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('color', color)}
                  className={`h-8 w-8 shrink-0 rounded-xl transition-transform hover:scale-110 ${form.color === color ? 'scale-110 ring-2 ring-[#6b38d4] ring-offset-2' : ''
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(event) => set('color', event.target.value)}
                className="h-8 w-8 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                title="Color personalizado"
              />
            </div>
          </FormField>

          <div className="flex items-center gap-3">
            <StatusToggle active={form.activo} onChange={(value) => set('activo', value)} />
            <span className="text-[0.875rem] font-medium text-[#494454]">
              Profesional activo (visible para reservas)
            </span>
          </div>

          {errors.api && (
            <div className="rounded-lg bg-[#ffdad6] px-4 py-3 text-[0.8rem] font-medium text-[#93000a]">
              {errors.api}
            </div>
          )}
        </div>
      )}

      {tab === 'horario' && (
        <HorarioEditor
          horario={form.horarioSemanal}
          onChange={(value) => set('horarioSemanal', value)}
          error={errors.horarioSemanal}
          slotDurationMinutes={slotDurationMinutes}
        />
      )}
    </AdminModal>
  );
}

export default function ProfessionalsPage() {
  const { data: professionals = [], isLoading } = useAdminProfessionals();
  const deleteMut = useAdminDeleteProfessional();
  const updateMut = useAdminUpdateProfessional();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = useMemo(() => {
    if (!search) return professionals;

    const query = search.toLowerCase();
    return professionals.filter((professional) => (
      professional.nombre.toLowerCase().includes(query)
      || (professional.especialidad || '').toLowerCase().includes(query)
    ));
  }, [professionals, search]);

  function getDiasActivos(horario) {
    if (!horario) return '-';

    const labels = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
    return Object.entries(horario)
      .filter(([, value]) => value?.activo)
      .map(([key]) => labels[key] || key)
      .join(' · ') || '-';
  }

  const columns = [
    {
      key: 'nombre',
      label: 'Profesional',
      render: (professional) => (
        <div className={`flex items-center gap-3 ${professional.activo === false ? 'opacity-50' : ''}`}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: professional.color || '#6b38d4' }}
          >
            {professional.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-[0.875rem] font-bold text-[#131b2e]">{professional.nombre}</p>
            <p className="text-[0.75rem] text-[#494454]">{professional.especialidad}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'horario',
      label: 'Horario',
      render: (professional) => (
        <span className="font-mono text-[0.8rem] text-[#494454]">
          {getDiasActivos(professional.horarioSemanal)}
        </span>
      ),
    },
    {
      key: 'activo',
      label: 'Estado',
      className: 'text-center',
      render: (professional) => (
        <div className="flex justify-center">
          <StatusToggle
            active={professional.activo !== false}
            onChange={(value) => updateMut.mutate({ id: professional._id, activo: value })}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'text-right',
      render: (professional) => (
        <ActionButtons
          onEdit={() => setModal(professional)}
          onDelete={() => {
            setDeleteError('');
            setDeleteTarget(professional);
          }}
        />
      ),
    },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AdminPageHeader
        title="Profesionales"
        subtitle="Gestiona el equipo y sus horarios semanales"
        actionLabel="Nuevo Profesional"
        onAction={() => setModal('new')}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar profesional..."
      />

      <AdminTable
        columns={columns}
        rows={filtered.map((professional) => ({ ...professional, id: professional._id }))}
        loading={isLoading}
        emptyIcon="badge"
        emptyText="No hay profesionales. Crea el primero."
      />

      <ProfModal
        key={modal?._id || 'new'}
        open={modal !== null}
        onClose={() => setModal(null)}
        initial={modal !== 'new' ? modal : undefined}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Eliminar Profesional"
        description={`Eliminar "${deleteTarget?.nombre}"? Se borrara del sistema y se quitara de servicios y bloqueos si no tiene citas asociadas.`}
        error={deleteError}
        onConfirm={() => deleteMut.mutate(deleteTarget._id, {
          onSuccess: () => {
            setDeleteError('');
            setDeleteTarget(null);
          },
          onError: (error) => {
            setDeleteError(error?.response?.data?.error || 'No se pudo eliminar el profesional');
          },
        })}
        onCancel={() => {
          setDeleteError('');
          setDeleteTarget(null);
        }}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
