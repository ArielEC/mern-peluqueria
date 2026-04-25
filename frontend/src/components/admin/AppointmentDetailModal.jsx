import { useMemo, useState } from 'react';
import { useAdminUpdateAppointment, useAdminCancelAppointment } from '@/hooks/useAdminAppointments';
import { useSettings } from '@/hooks/useSettings';
import { formatTimeInTz, formatDateInTz } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'confirmada', label: 'Confirmada', color: 'bg-[#e9ddff] text-[#4e3b7c]' },
  { value: 'completada', label: 'Completada', color: 'bg-[#e9ddff] text-[#544183]' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-[#ffdad6] text-[#93000a]' },
  { value: 'no_presentado', label: 'No presentado', color: 'bg-[#eaedff] text-[#494454]' },
];

function getStatusOption(status) {
  return STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];
}

export default function AppointmentDetailModal({ appointment, onClose }) {
  const initialFinBase = appointment?.fechaHoraFinOperativa || appointment?.fechaHoraFin || appointment?.fechaHoraInicio;
  const initialHasAppointmentEnded = appointment?.estado !== 'cancelada'
    && Boolean(initialFinBase && new Date(initialFinBase) <= new Date());
  const initialResolvedStatus = appointment?.estado === 'confirmada' && initialHasAppointmentEnded
    ? 'completada'
    : appointment?.estado || 'confirmada';

  const [estado, setEstado] = useState(() => initialResolvedStatus);
  const [notasInternas, setNotasInternas] = useState(() => appointment?.notasInternas || '');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  const updateMutation = useAdminUpdateAppointment();
  const cancelMutation = useAdminCancelAppointment();
  const { data: settings } = useSettings();
  const businessTz = settings?.zonaHoraria || 'Europe/Madrid';

  const prof = appointment?.profesional;
  const serv = appointment?.servicio;
  const client = appointment?.cliente;
  const inicio = appointment ? new Date(appointment.fechaHoraInicio) : null;
  const finBase = appointment?.fechaHoraFinOperativa || appointment?.fechaHoraFin || appointment?.fechaHoraInicio;
  const fin = finBase ? new Date(finBase) : null;
  const hasAppointmentEnded = appointment?.estado !== 'cancelada' && Boolean(fin && fin <= new Date());
  const resolvedStatus = useMemo(() => {
    if (appointment?.estado === 'confirmada' && hasAppointmentEnded) {
      return 'completada';
    }

    return appointment?.estado || 'confirmada';
  }, [appointment?.estado, hasAppointmentEnded]);
  const displayedStatus = estado === 'no_presentado' ? 'no_presentado' : resolvedStatus;
  const displayedStatusOption = useMemo(
    () => getStatusOption(displayedStatus),
    [displayedStatus]
  );
  const canMarkNoShow = hasAppointmentEnded
    && appointment?.estado !== 'cancelada'
    && resolvedStatus !== 'no_presentado';
  const canCancelAppointment = appointment?.estado !== 'cancelada' && !hasAppointmentEnded;

  if (!appointment || !inicio) return null;

  function handleUpdate() {
    const payload = {
      id: appointment._id,
      notasInternas,
    };

    if (estado === 'no_presentado' && appointment?.estado !== 'no_presentado') {
      payload.estado = 'no_presentado';
    }

    updateMutation.mutate(
      payload,
      { onSuccess: onClose }
    );
  }

  function handleCancel() {
    cancelMutation.mutate(
      { id: appointment._id, motivoCancelacion },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-[#131b2e]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl z-10 overflow-hidden">
        <div className="h-1 bg-[#6b38d4]" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#cbc3d7]/20 flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#131b2e]">Detalle de Cita</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f2f3ff] text-[#494454]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Info básica */}
          <div className="bg-[#f2f3ff] rounded-lg p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#494454] mb-0.5">Servicio</p>
                <p className="font-bold text-[#131b2e]">{serv?.nombre}</p>
                {serv?.duracion && <p className="text-[0.75rem] text-[#494454]">{serv.duracion} min</p>}
              </div>
              {serv?.precio != null && (
                <p className="text-xl font-black text-[#6b38d4]">{serv.precio}€</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#cbc3d7]/20">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#494454] mb-0.5">Fecha</p>
                <p className="text-[0.8rem] font-bold text-[#131b2e] capitalize">
                  {formatDateInTz(inicio, businessTz)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#494454] mb-0.5">Hora</p>
                <p className="text-[0.8rem] font-bold text-[#131b2e]">
                  {formatTimeInTz(inicio, businessTz)}{fin && ` — ${formatTimeInTz(fin, businessTz)}`}
                </p>
                <p className="text-[0.6rem] text-[#494454]/60">{businessTz}</p>
              </div>
              {client && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#494454] mb-0.5">Cliente</p>
                  <p className="text-[0.8rem] font-bold text-[#131b2e]">{client.nombre}</p>
                  {client.telefono && <p className="text-[0.7rem] text-[#494454]">{client.telefono}</p>}
                </div>
              )}
              {prof && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#494454] mb-0.5">Profesional</p>
                  <p className="text-[0.8rem] font-bold text-[#131b2e]">{prof.nombre}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cambiar estado */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#494454] mb-2">Estado</p>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-full text-[0.75rem] font-bold ${displayedStatusOption.color}`}>
                  {displayedStatusOption.label}
                </span>
              </div>

              {canMarkNoShow && (
                <button
                  type="button"
                  onClick={() => setEstado((current) => (current === 'no_presentado' ? resolvedStatus : 'no_presentado'))}
                  className={`px-3 py-1.5 rounded-full text-[0.75rem] font-bold transition-all ${
                    estado === 'no_presentado'
                      ? 'bg-[#eaedff] text-[#494454] ring-2 ring-[#6b38d4]/40'
                      : 'bg-[#eaedff] text-[#494454] hover:bg-[#e2e7ff]'
                  }`}
                >
                  Marcar como no presentado
                </button>
              )}
            </div>
          </div>

          {/* Notas internas */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#494454] mb-2">Notas internas</p>
            <textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              rows={2}
              placeholder="Observaciones internas del admin..."
              className="w-full bg-[#f2f3ff] rounded-lg px-3 py-2 text-base sm:text-[0.8rem] text-[#131b2e] placeholder:text-[#494454]/50 outline-none focus:ring-2 focus:ring-[#6b38d4] resize-none border-0"
            />
          </div>

          {/* Cancelar cita */}
          {canCancelAppointment && (
            <div className="border-t border-[#cbc3d7]/20 pt-4">
              {!confirmCancel ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full py-2.5 rounded-lg border border-[#ffdad6] text-[#93000a] font-bold text-[0.8rem] hover:bg-[#ffdad6]/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Cancelar esta cita
                </button>
              ) : (
                <div className="space-y-3 bg-[#ffdad6]/20 rounded-lg p-4">
                  <p className="text-[0.8rem] font-bold text-[#93000a]">¿Confirmar cancelación?</p>
                  <textarea
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    rows={2}
                    placeholder="Motivo (opcional)..."
                    className="w-full bg-white rounded-lg px-3 py-2 text-[0.8rem] outline-none focus:ring-2 focus:ring-red-400 resize-none border border-[#ffdad6]"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      className="flex-1 py-2 rounded-lg bg-[#eaedff] text-[#494454] font-bold text-[0.8rem]"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="flex-1 py-2 rounded-lg bg-[#ba1a1a] text-white font-bold text-[0.8rem] disabled:opacity-60 flex items-center justify-center"
                    >
                      {cancelMutation.isPending
                        ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        : 'Sí, cancelar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 pt-0 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff] transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {updateMutation.isPending
              ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
