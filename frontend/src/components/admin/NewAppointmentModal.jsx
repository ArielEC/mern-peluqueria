import { useState, useEffect, useMemo } from 'react';
import { useAdminServices, useAdminProfessionals, useAdminClients } from '@/hooks/useAdminEntities';
import { useAdminCreateAppointment } from '@/hooks/useAdminAppointments';
import { useSettings } from '@/hooks/useSettings';

/**
 * Construye una ISO string en la zona horaria del negocio a partir de un datetime-local.
 * Evita que el navegador interprete la hora en la TZ local del dispositivo.
 */
function getIANAOffset(tz, date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const raw = tzName.replace('GMT', '') || '+00:00';
    const match = raw.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return '+00:00';
    const h = match[2].padStart(2, '0');
    const m = match[3] ?? '00';
    return `${match[1]}${h}:${m}`;
  } catch {
    return '+00:00';
  }
}

function buildFechaHoraAdmin(datetimeLocalStr, businessTz = 'Europe/Madrid') {
  if (!datetimeLocalStr) return '';
  // datetimeLocalStr es "YYYY-MM-DDTHH:mm"
  const approx = new Date(datetimeLocalStr + ':00.000Z');
  const offset = getIANAOffset(businessTz, approx);
  return `${datetimeLocalStr}:00.000${offset}`;
}

function formatDatetimeLocalInTz(value, businessTz = 'Europe/Madrid') {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: businessTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type) => parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#494454]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default function NewAppointmentModal({ initialDate, initialProfesionalId, onClose, onSuccess }) {
  const { data: services = [] } = useAdminServices();
  const { data: allProfessionals = [] } = useAdminProfessionals();
  const { data: settings } = useSettings();
  const businessTimezone = settings?.zonaHoraria || 'Europe/Madrid';

  // Búsqueda de clientes: texto del input + debounce para la API
  const [clientSearchInput, setClientSearchInput] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data: clients = [], isFetching: clientsLoading } = useAdminClients(debouncedSearch);
  const createMutation = useAdminCreateAppointment();

  // Debounce de 300ms para la búsqueda de clientes en la API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(clientSearchInput), 300);
    return () => clearTimeout(timer);
  }, [clientSearchInput]);

  // Filtrado local inmediato sobre los resultados ya cargados
  const filteredClients = useMemo(() => {
    if (!clientSearchInput.trim()) return clients;
    const q = clientSearchInput.toLowerCase().trim();
    return clients.filter(
      (c) =>
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clients, clientSearchInput]);

  // Solo mostrar profesionales activos en el select
  const professionals = useMemo(() => allProfessionals.filter((p) => p.activo !== false), [allProfessionals]);

  const defaultDatetime = useMemo(
    () => formatDatetimeLocalInTz(initialDate, businessTimezone),
    [initialDate, businessTimezone]
  );

  const [form, setForm] = useState({
    servicioId: '',
    profesionalId: initialProfesionalId || '',
    clienteId: '',
    fechaHoraInicio: defaultDatetime,
    notasCliente: '',
    forceOverbook: false,
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.servicioId) errs.servicioId = 'Selecciona un servicio';
    if (!form.clienteId) errs.clienteId = 'Selecciona un cliente';
    if (!form.fechaHoraInicio) errs.fechaHoraInicio = 'Selecciona fecha y hora';
    else if (new Date(buildFechaHoraAdmin(form.fechaHoraInicio, businessTimezone)) <= new Date()) {
      errs.fechaHoraInicio = 'La fecha debe ser futura';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Construir ISO con la TZ del negocio (no la del navegador)
    const fechaHoraISO = buildFechaHoraAdmin(form.fechaHoraInicio, businessTimezone);
    const payload = {
      servicioId: form.servicioId,
      fechaHoraInicio: fechaHoraISO,
      clienteId: form.clienteId,
      ...(form.profesionalId && { profesionalId: form.profesionalId }),
      ...(form.notasCliente.trim() && { notasCliente: form.notasCliente.trim() }),
      ...(form.forceOverbook && { forceOverbook: true }),
    };

    createMutation.mutate(payload, {
      onSuccess: (data) => { onSuccess?.(data); onClose(); },
      onError: (err) => {
        setErrors({ api: err?.response?.data?.error || 'Error al crear la cita' });
      },
    });
  }

  // Solo servicios activos para el select
  const activeServices = useMemo(() => services.filter((s) => s.activo !== false), [services]);
  const selectedService = activeServices.find((s) => s._id === form.servicioId);

  // Filtrar profesionales capacitados y activos para el servicio seleccionado
  const filteredProfessionals = useMemo(() => {
    if (!selectedService) return professionals;
    const capaces = selectedService.profesionalesCapaces || [];
    if (capaces.length === 0) return professionals;
    const capaceIds = capaces.map((p) => typeof p === 'object' ? p._id : p);
    return professionals.filter((p) => capaceIds.includes(p._id));
  }, [selectedService, professionals]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#131b2e]/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — max-h y overflow controlados para evitar desborde del logo/header */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10 flex flex-col max-h-[calc(100vh-1.5rem)] overflow-hidden">
        {/* Header */}
        <div className="h-1 bg-[#6b38d4] shrink-0" />
        <div className="p-4 sm:p-6 border-b border-[#cbc3d7]/20 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#6b38d4]/10 flex items-center justify-center text-[#6b38d4] shrink-0 overflow-hidden">
              <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[#131b2e] truncate">Nueva Cita Manual</h2>
              <p className="text-[0.75rem] text-[#494454]">Creación por administrador</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f2f3ff] text-[#494454] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Cliente — combobox con buscador */}
          <Field label="Cliente" error={errors.clienteId}>
            <div className="relative">
              <input
                type="text"
                value={isClientDropdownOpen ? clientSearchInput : (form.clienteId ? `${clients.find(c => c._id === form.clienteId)?.nombre || ''} (${clients.find(c => c._id === form.clienteId)?.email || ''})` : clientSearchInput)}
                onChange={(e) => {
                  setClientSearchInput(e.target.value);
                  set('clienteId', '');
                  setIsClientDropdownOpen(true);
                }}
                onFocus={() => setIsClientDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)}
                placeholder="Buscar cliente por nombre o email..."
                className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-base sm:text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4] placeholder:text-[#494454]/50"
              />
              {clientsLoading && clientSearchInput && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="w-4 h-4 rounded-full border-2 border-[#6b38d4] border-t-transparent animate-spin block" />
                </div>
              )}
              {isClientDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#cbc3d7]/40 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-3 text-[0.875rem] text-[#494454]/60 text-center">Sin resultados</div>
                  ) : (
                    filteredClients.map((c) => (
                      <div
                        key={c._id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Evita que onBlur gane la carrera
                          set('clienteId', c._id);
                          setClientSearchInput('');
                          setIsClientDropdownOpen(false);
                        }}
                        className={`px-3 py-2.5 text-base sm:text-[0.875rem] cursor-pointer transition-colors border-b border-[#cbc3d7]/10 last:border-0 ${form.clienteId === c._id ? 'bg-[#6b38d4]/10 text-[#6b38d4] font-bold' : 'text-[#131b2e] hover:bg-[#f2f3ff]'}`}
                      >
                        {c.nombre} <span className="text-[0.75rem] opacity-60">({c.email})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Field>

          {/* Servicio */}
          <Field label="Servicio" error={errors.servicioId}>
            <select
              value={form.servicioId}
              onChange={(e) => set('servicioId', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-base sm:text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            >
              <option value="">— Selecciona un servicio —</option>
              {activeServices.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.nombre}{s.duracion ? ` (${s.duracion} min)` : ''}{s.precio != null ? ` — ${s.precio}€` : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Profesional — solo activos y capaces para el servicio */}
          <Field label="Profesional">
            <select
              value={form.profesionalId}
              onChange={(e) => set('profesionalId', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-base sm:text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            >
              <option value="">— Automático —</option>
              {filteredProfessionals.map((p) => (
                <option key={p._id} value={p._id}>{p.nombre}{p.especialidad ? ` · ${p.especialidad}` : ''}</option>
              ))}
            </select>
          </Field>

          {/* Fecha y hora */}
          <Field label={`Fecha y Hora (${businessTimezone})`} error={errors.fechaHoraInicio}>
            <input
              type="datetime-local"
              value={form.fechaHoraInicio}
              onChange={(e) => set('fechaHoraInicio', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-base sm:text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            />
            <p className="text-[0.65rem] text-[#494454]/60 mt-0.5">
              La hora corresponde a la zona horaria de la peluquería ({businessTimezone})
            </p>
          </Field>

          {/* Resumen servicio seleccionado */}
          {selectedService && (
            <div className="bg-[#f2f3ff] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[0.8rem]">
              <div>
                <p className="font-bold text-[#131b2e]">{selectedService.nombre}</p>
                {selectedService.duracion && (
                  <p className="text-[#494454]">{selectedService.duracion} min</p>
                )}
              </div>
              {selectedService.precio != null && (
                <span className="font-black text-[#6b38d4] text-base">{selectedService.precio}€</span>
              )}
            </div>
          )}

          {/* Notas */}
          <Field label="Notas (opcional)">
            <textarea
              value={form.notasCliente}
              onChange={(e) => set('notasCliente', e.target.value)}
              rows={3}
              placeholder="Indicaciones para el profesional..."
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-base sm:text-[0.875rem] text-[#131b2e] placeholder:text-[#494454]/50 outline-none focus:ring-2 focus:ring-[#6b38d4] resize-none"
            />
          </Field>

          {/* Force overbook */}
          <label className="flex items-center gap-3 p-3 bg-[#ffdad6]/30 rounded-lg cursor-pointer group">
            <input
              type="checkbox"
              checked={form.forceOverbook}
              onChange={(e) => set('forceOverbook', e.target.checked)}
              className="w-4 h-4 rounded accent-[#6b38d4]"
            />
            <div>
              <p className="text-[0.8rem] font-bold text-[#131b2e]">Forzar overbooking</p>
              <p className="text-[0.7rem] text-[#494454]">Permite crear la cita aunque el profesional no tenga disponibilidad</p>
            </div>
          </label>

          {/* API error */}
          {errors.api && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-lg px-4 py-3 text-[0.8rem] font-medium">
              {errors.api}
            </div>
          )}
        </form>

        {/* Footer — siempre visible */}
        <div className="p-4 sm:p-6 pt-4 flex flex-col sm:flex-row gap-3 shrink-0 border-t border-[#cbc3d7]/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">add</span>
                Crear Cita
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
