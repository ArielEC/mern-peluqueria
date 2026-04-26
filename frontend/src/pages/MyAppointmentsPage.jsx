import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Clock,
  History,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments';
import { useSettings } from '@/hooks/useSettings';
import { formatDateInTz, formatTimeInTz } from '@/lib/utils';

function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(price);
}

function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function getCancellationLabel(canceladaPor) {
  if (canceladaPor === 'cliente') return 'Cancelada por ti';
  if (canceladaPor === 'admin') return 'Cancelada por administración';
  return 'Cancelada';
}

function canCancelAppointment(appointment, horasMinimas = 24) {
  if (appointment.estado !== 'confirmada') return false;
  const inicio = new Date(appointment.fechaHoraInicio);
  const ahora = new Date();
  const horasRestantes = (inicio - ahora) / (1000 * 60 * 60);
  return horasRestantes >= horasMinimas;
}

function isUpcoming(appointment) {
  if (appointment.estado === 'cancelada' || appointment.estado === 'no_presentado') return false;
  if (appointment.estado === 'completada') return false;
  const inicio = new Date(appointment.fechaHoraInicio);
  return inicio >= new Date();
}

const STATUS_CONFIG = {
  confirmada: { label: 'Confirmada', cls: 'bg-primary/10 text-primary', Icon: CalendarCheck },
  completada: { label: 'Completada', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
  cancelada: { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive', Icon: XCircle },
  no_presentado: { label: 'No presentado', cls: 'bg-muted text-muted-foreground', Icon: AlertCircle },
};

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] ?? STATUS_CONFIG.no_presentado;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ProfAvatar({ nombre, color, size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-sm' : 'w-10 h-10 text-xs';
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-xl flex items-center justify-center text-white font-black`}
      style={{ backgroundColor: color || '#6b38d4' }}
    >
      {getInitials(nombre)}
    </div>
  );
}

function UpcomingCard({ appointment, horasMinimas, onCancel, businessTz }) {
  const prof = appointment.profesional;
  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const fin = appointment.fechaHoraFin ? new Date(appointment.fechaHoraFin) : null;
  const cancellable = canCancelAppointment(appointment, horasMinimas);
  const clientNote = appointment.notasCliente?.trim() || '';

  return (
    <div className="ambient-shadow bg-card rounded-xl border border-border/20 p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <ProfAvatar nombre={prof?.nombre} color={prof?.color} />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <StatusBadge estado={appointment.estado} />
            <span className="text-muted-foreground text-xs font-medium">
              Ref: #{appointment._id.slice(-6).toUpperCase()}
            </span>
          </div>
          <h3 className="text-foreground text-base font-bold leading-snug break-words">{serv?.nombre}</h3>
          <p className="text-muted-foreground text-sm">
            con <span className="text-foreground font-semibold">{prof?.nombre}</span>
            {serv?.duracion && <span className="text-muted-foreground"> · {formatDuration(serv.duracion)}</span>}
          </p>
        </div>

        <div className="w-full shrink-0 space-y-0.5 text-left md:w-auto md:text-right">
          <div className="text-primary flex items-center gap-1.5 text-sm font-bold md:justify-end">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">{formatDateInTz(inicio, businessTz)}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm md:justify-end">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatTimeInTz(inicio, businessTz)}
              {fin && ` — ${formatTimeInTz(fin, businessTz)}`}
            </span>
          </div>
          <p className="text-foreground mt-1 text-base font-black">
            {formatPrice(appointment.precioFinal ?? serv?.precio)}
          </p>
        </div>
      </div>

      {clientNote && (
        <div className="bg-primary/5 mt-4 rounded-xl px-4 py-3 text-sm text-muted-foreground">
          <p className="text-primary mb-1 text-[10px] font-black uppercase tracking-widest">Tu nota al profesional</p>
          <p className="text-foreground/90 leading-relaxed">{clientNote}</p>
        </div>
      )}

      <div className="border-border/20 mt-4 w-full border-t pt-3">
        {cancellable ? (
          <button
            onClick={() => onCancel(appointment)}
            className="text-destructive flex w-full items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors hover:bg-destructive/10 md:w-auto"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        ) : (
          <span className="text-muted-foreground/50 block px-2 text-center text-[10px] font-bold uppercase tracking-wide md:text-right">
            No cancelable
          </span>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ appointment, businessTz }) {
  const prof = appointment.profesional;
  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const cfg = STATUS_CONFIG[appointment.estado] ?? STATUS_CONFIG.no_presentado;
  const Icon = cfg.Icon;
  const clientNote = appointment.notasCliente?.trim() || '';
  const cancellationReason = appointment.motivoCancelacion?.trim() || '';
  const cancellationLabel = appointment.estado === 'cancelada'
    ? getCancellationLabel(appointment.canceladaPor)
    : null;
  const textColor = cfg.cls.split(' ').find((c) => c.startsWith('text-')) ?? '';

  return (
    <div className="bg-muted/50 hover:bg-muted/80 rounded-xl p-4 transition-colors md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${textColor}`} strokeWidth={2} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>
              {cfg.label}
            </span>
          </div>
          <h4 className="text-foreground font-bold leading-snug break-words">{serv?.nombre}</h4>
          <p className="text-muted-foreground text-xs">
            {formatDateInTz(inicio, businessTz)}
            {prof?.nombre && ` · ${prof.nombre}`}
          </p>

          {(clientNote || cancellationLabel || cancellationReason) && (
            <div className="mt-3 space-y-2">
              {clientNote && (
                <div className="bg-card/80 rounded-lg px-3 py-2">
                  <p className="text-primary mb-1 text-[10px] font-black uppercase tracking-widest">Tu nota al profesional</p>
                  <p className="text-foreground/90 text-xs leading-relaxed">{clientNote}</p>
                </div>
              )}
              {(cancellationLabel || cancellationReason) && (
                <div className="bg-destructive/5 border-destructive/15 rounded-lg border px-3 py-2">
                  <p className="text-destructive mb-1 text-[10px] font-black uppercase tracking-widest">
                    {cancellationLabel || 'Motivo de cancelación'}
                  </p>
                  <p className="text-foreground/90 text-xs leading-relaxed">
                    {cancellationReason || 'Sin motivo de cancelación indicado.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-3 md:w-auto">
          <span className="text-muted-foreground text-sm font-bold">
            {formatPrice(appointment.precioFinal ?? serv?.precio)}
          </span>
          {appointment.estado === 'completada' && (
            <Link
              to="/book"
              className="text-primary flex items-center gap-1 text-xs font-bold hover:underline"
            >
              Reservar de nuevo
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelModal({ appointment, horasMinimas, onClose, onConfirm, isPending, businessTz }) {
  const [reason, setReason] = useState('');

  if (!appointment) return null;

  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const fin = appointment.fechaHoraFin ? new Date(appointment.fechaHoraFin) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-foreground/20 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="ambient-shadow bg-card relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-y-auto rounded-xl">
        <div className="p-6 pb-0 md:p-8 md:pb-0">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 text-destructive flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <XCircle className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-foreground text-xl font-bold tracking-tight">Cancelar cita</h2>
                <p className="text-muted-foreground text-sm">Confirma que deseas cancelar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-muted mb-6 space-y-4 rounded-xl p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-widest">Servicio</p>
                <p className="text-foreground text-base font-semibold break-words">{serv?.nombre}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-widest">Precio</p>
                <p className="text-primary font-bold">{formatPrice(appointment.precioFinal ?? serv?.precio)}</p>
              </div>
            </div>
            <div className="border-border/20 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest">Fecha</span>
                  <span className="text-foreground text-sm font-medium capitalize">
                    {formatDateInTz(inicio, businessTz)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest">Hora</span>
                  <span className="text-foreground text-sm font-medium">
                    {formatTimeInTz(inicio, businessTz)}{fin && ` — ${formatTimeInTz(fin, businessTz)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="text-foreground mb-2 block text-sm font-bold">
                Motivo de cancelación <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Cuéntanos el motivo para que podamos mejorar..."
                className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 w-full resize-none rounded-xl border-0 p-4 text-base outline-none transition-all focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>

            <div className="border-amber-200/60 bg-amber-50 flex items-start gap-3 rounded-xl border p-4">
              <Info className="text-amber-600 mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-amber-800 text-xs leading-relaxed">
                Las cancelaciones con menos de <strong>{horasMinimas}h de antelación</strong> pueden estar sujetas a penalización según la política del establecimiento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6 pt-0 md:flex-row md:p-8 md:pt-0">
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="bg-destructive flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? (
              <span className="mx-auto block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              'Confirmar cancelación'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground flex-1 rounded-xl border bg-transparent px-6 py-3.5 font-semibold transition-all active:scale-[0.98]"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="border-border/30 text-muted-foreground rounded-xl border-2 border-dashed py-16 text-center">
      {tab === 'upcoming' ? (
        <>
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No tienes citas próximas</p>
          <Link
            to="/book"
            className="text-primary mt-4 inline-flex items-center gap-2 text-sm font-bold hover:underline"
          >
            Reservar ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <>
          <History className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Sin historial todavía</p>
        </>
      )}
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: appointments = [], isLoading } = useAppointments();
  const { data: settings } = useSettings();
  const cancelMutation = useCancelAppointment();

  const horasMinimas = settings?.horasMinimasCancelacion ?? 24;
  const businessTz = settings?.zonaHoraria || 'Europe/Madrid';

  const upcomingList = appointments
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio));

  const pastList = appointments
    .filter((a) => !isUpcoming(a))
    .sort((a, b) => new Date(b.fechaHoraInicio) - new Date(a.fechaHoraInicio));

  function handleConfirmCancel(reason) {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget._id, motivoCancelacion: reason },
      { onSuccess: () => setCancelTarget(null) }
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="mb-10">
          <h1 className="text-foreground mb-2 text-3xl font-extrabold tracking-display md:text-4xl">
            Mis citas
          </h1>
          <p className="text-muted-foreground font-medium">
            Gestiona tus próximas visitas y consulta tu historial.
          </p>
          <p className="text-muted-foreground/60 mt-1 flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Horarios en zona horaria: {businessTz}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="bg-muted space-y-6 rounded-xl p-5 sm:p-6 lg:sticky lg:top-24">
              <div>
                <span className="text-muted-foreground mb-1 block text-[10px] font-bold uppercase tracking-widest">
                  Total reservas
                </span>
                <span className="text-primary text-3xl font-bold">{appointments.length}</span>
              </div>

              <div className="bg-border/40 h-px" />

              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    activeTab === 'upcoming'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <CalendarCheck className="h-4 w-4 shrink-0" />
                  Próximas
                  {upcomingList.length > 0 && (
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      activeTab === 'upcoming' ? 'bg-white/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {upcomingList.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    activeTab === 'past'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <History className="h-4 w-4 shrink-0" />
                  Historial
                </button>
              </nav>

              <div className="border-border/40 border-t pt-2">
                <Link
                  to="/book"
                  className="bg-primary/10 text-primary hover:bg-primary/20 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors"
                >
                  Nueva reserva
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>

          <div className="space-y-8 lg:col-span-9">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card border-border/20 h-28 rounded-xl border animate-pulse" />
                ))}
              </div>
            ) : activeTab === 'upcoming' ? (
              <section>
                <div className="mb-5 flex items-center gap-2">
                  <h2 className="text-foreground text-xl font-bold">Próximas visitas</h2>
                  {upcomingList.length > 0 && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-black">
                      {upcomingList.length}
                    </span>
                  )}
                </div>
                {upcomingList.length === 0 ? (
                  <EmptyState tab="upcoming" />
                ) : (
                  <div className="space-y-4">
                    {upcomingList.map((apt) => (
                      <UpcomingCard
                        key={apt._id}
                        appointment={apt}
                        horasMinimas={horasMinimas}
                        onCancel={setCancelTarget}
                        businessTz={businessTz}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section>
                <h2 className="text-muted-foreground mb-5 text-xl font-bold">Historial reciente</h2>
                {pastList.length === 0 ? (
                  <EmptyState tab="past" />
                ) : (
                  <div className="space-y-3">
                    {pastList.map((apt) => (
                      <HistoryRow key={apt._id} appointment={apt} businessTz={businessTz} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <CancelModal
        appointment={cancelTarget}
        horasMinimas={horasMinimas}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        isPending={cancelMutation.isPending}
        businessTz={businessTz}
      />
    </div>
  );
}
