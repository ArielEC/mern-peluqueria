import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAdminServices, useAdminProfessionals, useAdminClients } from '@/hooks/useAdminEntities';
import { useAdminCreateAppointment } from '@/hooks/useAdminAppointments';

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
  const [clientSearch, setClientSearch] = useState('');
  const { data: clients = [] } = useAdminClients(clientSearch);
  const createMutation = useAdminCreateAppointment();

  // Solo mostrar profesionales activos en el select
  const professionals = useMemo(() => allProfessionals.filter((p) => p.activo !== false), [allProfessionals]);

  // Formato datetime-local: "YYYY-MM-DDTHH:mm"
  const defaultDatetime = initialDate
    ? format(new Date(initialDate), "yyyy-MM-dd'T'HH:mm")
    : '';

  const [form, setForm] = useState({
    servicioId: '',
    profesionalId: initialProfesionalId || '',
    clienteId: '',
    fechaHoraInicio: defaultDatetime,
    notasCliente: '',
    forceOverbook: false,
  });
  const [errors, setErrors] = useState({});

  // Sync cuando se pasa initialProfesionalId desde el calendario
  useEffect(() => {
    if (initialProfesionalId) {
      setForm((f) => ({ ...f, profesionalId: initialProfesionalId }));
    }
  }, [initialProfesionalId]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.servicioId) errs.servicioId = 'Selecciona un servicio';
    if (!form.clienteId) errs.clienteId = 'Selecciona un cliente';
    if (!form.fechaHoraInicio) errs.fechaHoraInicio = 'Selecciona fecha y hora';
    else if (new Date(form.fechaHoraInicio) <= new Date()) {
      errs.fechaHoraInicio = 'La fecha debe ser futura';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const fechaHoraISOLocal = new Date(form.fechaHoraInicio).toISOString();
    const payload = {
      servicioId: form.servicioId,
      fechaHoraInicio: fechaHoraISOLocal,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#131b2e]/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — max-h to prevent overflow, flex layout for scroll */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-1 bg-[#6b38d4] shrink-0" />
        <div className="p-6 border-b border-[#cbc3d7]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#6b38d4]/10 flex items-center justify-center text-[#6b38d4] shrink-0">
              <span className="material-symbols-outlined text-[20px]">event_add</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Cliente */}
          <Field label="Cliente" error={errors.clienteId}>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o email..."
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2 text-[0.8rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4] placeholder:text-[#494454]/50 mb-1"
            />
            <select
              value={form.clienteId}
              onChange={(e) => set('clienteId', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            >
              <option value="">— Selecciona un cliente —</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre} ({c.email})
                </option>
              ))}
            </select>
          </Field>

          {/* Servicio */}
          <Field label="Servicio" error={errors.servicioId}>
            <select
              value={form.servicioId}
              onChange={(e) => set('servicioId', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
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
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            >
              <option value="">— Automático —</option>
              {filteredProfessionals.map((p) => (
                <option key={p._id} value={p._id}>{p.nombre}{p.especialidad ? ` · ${p.especialidad}` : ''}</option>
              ))}
            </select>
          </Field>

          {/* Fecha y hora */}
          <Field label="Fecha y Hora" error={errors.fechaHoraInicio}>
            <input
              type="datetime-local"
              value={form.fechaHoraInicio}
              onChange={(e) => set('fechaHoraInicio', e.target.value)}
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-[0.875rem] text-[#131b2e] outline-none focus:ring-2 focus:ring-[#6b38d4]"
            />
          </Field>

          {/* Resumen servicio seleccionado */}
          {selectedService && (
            <div className="bg-[#f2f3ff] rounded-lg p-4 flex items-center justify-between text-[0.8rem]">
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
              className="w-full bg-[#f2f3ff] border-0 rounded-lg px-3 py-2.5 text-[0.875rem] text-[#131b2e] placeholder:text-[#494454]/50 outline-none focus:ring-2 focus:ring-[#6b38d4] resize-none"
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

        {/* Footer */}
        <div className="p-6 pt-4 flex gap-3 shrink-0 border-t border-[#cbc3d7]/20">
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
