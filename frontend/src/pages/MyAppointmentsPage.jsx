import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, Clock, CalendarCheck, History,
  X, CheckCircle, XCircle, AlertCircle, Info, ArrowRight,
} from 'lucide-react';
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments';
import { useSettings } from '@/hooks/useSettings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
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

function canCancelAppointment(appointment, horasMinimas = 24) {
  if (appointment.estado !== 'confirmada') return false;
  const inicio = new Date(appointment.fechaHoraInicio);
  const ahora = new Date();
  const horasRestantes = (inicio - ahora) / (1000 * 60 * 60);
  return horasRestantes > horasMinimas;
}

function isUpcoming(appointment) {
  if (appointment.estado === 'cancelada' || appointment.estado === 'no_presentado') return false;
  if (appointment.estado === 'completada') return false;
  const inicio = new Date(appointment.fechaHoraInicio);
  return inicio >= new Date();
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  confirmada:    { label: 'Confirmada',    cls: 'bg-primary/10 text-primary',         Icon: CalendarCheck },
  completada:    { label: 'Completada',    cls: 'bg-green-100 text-green-700',         Icon: CheckCircle },
  cancelada:     { label: 'Cancelada',     cls: 'bg-destructive/10 text-destructive',  Icon: XCircle },
  no_presentado: { label: 'No presentado', cls: 'bg-muted text-muted-foreground',      Icon: AlertCircle },
};

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] ?? STATUS_CONFIG.no_presentado;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Professional avatar ──────────────────────────────────────────────────────

function ProfAvatar({ nombre, color, size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-sm' : 'w-10 h-10 text-xs';
  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center text-white font-black shrink-0`}
      style={{ backgroundColor: color || '#6b38d4' }}
    >
      {getInitials(nombre)}
    </div>
  );
}

// ─── Upcoming appointment card ────────────────────────────────────────────────

function UpcomingCard({ appointment, horasMinimas, onCancel }) {
  const prof = appointment.profesional;
  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const fin = appointment.fechaHoraFin ? new Date(appointment.fechaHoraFin) : null;
  const cancellable = canCancelAppointment(appointment, horasMinimas);

  return (
    <div className="bg-card rounded-xl p-5 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center ambient-shadow border border-border/20">
      {/* Avatar */}
      <ProfAvatar nombre={prof?.nombre} color={prof?.color} />

      {/* Details */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge estado={appointment.estado} />
          <span className="text-muted-foreground text-xs font-medium">
            Ref: #{appointment._id.slice(-6).toUpperCase()}
          </span>
        </div>
        <h3 className="text-base font-bold text-foreground truncate">{serv?.nombre}</h3>
        <p className="text-sm text-muted-foreground">
          con <span className="font-semibold text-foreground">{prof?.nombre}</span>
          {serv?.duracion && <span className="text-muted-foreground"> · {formatDuration(serv.duracion)}</span>}
        </p>
      </div>

      {/* Date + time + price */}
      <div className="shrink-0 text-left md:text-right space-y-0.5">
        <div className="flex items-center md:justify-end gap-1.5 text-primary font-bold text-sm">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="capitalize">
            {format(inicio, "d MMM yyyy", { locale: es })}
          </span>
        </div>
        <div className="flex items-center md:justify-end gap-1.5 text-muted-foreground text-sm">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {format(inicio, 'HH:mm')}
            {fin && ` — ${format(fin, 'HH:mm')}`}
          </span>
        </div>
        <p className="text-base font-black text-foreground mt-1">
          {formatPrice(appointment.precioFinal ?? serv?.precio)}
        </p>
      </div>

      {/* Cancel button */}
      <div className="w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-border/20">
        {cancellable ? (
          <button
            onClick={() => onCancel(appointment)}
            className="w-full md:w-auto px-5 py-2.5 text-destructive font-bold hover:bg-destructive/10 transition-colors rounded-lg flex items-center justify-center gap-1.5 text-sm"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide font-bold px-2 block text-center md:text-right">
            No cancelable
          </span>
        )}
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ appointment }) {
  const prof = appointment.profesional;
  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const cfg = STATUS_CONFIG[appointment.estado] ?? STATUS_CONFIG.no_presentado;
  const Icon = cfg.Icon;

  return (
    <div className="bg-muted/50 rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-3 items-start md:items-center hover:bg-muted/80 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 shrink-0 ${cfg.cls.replace('bg-', '').replace(/\/\d+/, '').trim()}`} strokeWidth={2} style={{ color: undefined }} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.cls.split(' ').find(c => c.startsWith('text-'))}`}>
            {cfg.label}
          </span>
        </div>
        <h4 className="font-bold text-foreground truncate">{serv?.nombre}</h4>
        <p className="text-xs text-muted-foreground">
          {format(inicio, "d MMM yyyy", { locale: es })}
          {prof?.nombre && ` · ${prof.nombre}`}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-muted-foreground font-bold text-sm">
          {formatPrice(appointment.precioFinal ?? serv?.precio)}
        </span>
        {appointment.estado === 'completada' && (
          <Link
            to="/book"
            className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
          >
            Reservar de nuevo
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Cancel modal ─────────────────────────────────────────────────────────────

function CancelModal({ appointment, horasMinimas, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');

  if (!appointment) return null;

  const prof = appointment.profesional;
  const serv = appointment.servicio;
  const inicio = new Date(appointment.fechaHoraInicio);
  const fin = appointment.fechaHoraFin ? new Date(appointment.fechaHoraFin) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-xl ambient-shadow overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="p-6 md:p-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                <XCircle className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-foreground text-xl font-bold tracking-tight">Cancelar cita</h2>
                <p className="text-muted-foreground text-sm">Confirma que deseas cancelar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary card */}
          <div className="bg-muted rounded-xl p-5 mb-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Servicio</p>
                <p className="text-foreground text-base font-semibold">{serv?.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Precio</p>
                <p className="text-primary font-bold">{formatPrice(appointment.precioFinal ?? serv?.precio)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Fecha</span>
                  <span className="text-foreground text-sm font-medium capitalize">
                    {format(inicio, "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Hora</span>
                  <span className="text-foreground text-sm font-medium">
                    {format(inicio, 'HH:mm')}{fin && ` — ${format(fin, 'HH:mm')}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason textarea */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-foreground text-sm font-bold mb-2">
                Motivo de cancelación <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Cuéntanos el motivo para que podamos mejorar..."
                className="w-full bg-primary/10 border-0 focus:ring-2 focus:ring-primary rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all resize-none outline-none"
              />
            </div>

            {/* Policy warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                Las cancelaciones con menos de <strong>{horasMinimas}h de antelación</strong> pueden estar sujetas a penalización según la política del establecimiento.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 md:p-8 pt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="flex-1 px-6 py-3.5 bg-destructive text-white font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              'Confirmar cancelación'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-6 py-3.5 bg-transparent border border-border/40 text-muted-foreground font-semibold rounded-xl hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  return (
    <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/30 rounded-xl">
      {tab === 'upcoming' ? (
        <>
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tienes citas próximas</p>
          <Link
            to="/book"
            className="mt-4 inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
          >
            Reservar ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <>
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin historial todavía</p>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyAppointmentsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: appointments = [], isLoading } = useAppointments();
  const { data: settings } = useSettings();
  const cancelMutation = useCancelAppointment();

  const horasMinimas = settings?.horasMinimasCancelacion ?? 24;

  // Partition appointments
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
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-12">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-display text-foreground mb-2">
            Mis citas
          </h1>
          <p className="text-muted-foreground font-medium">
            Gestiona tus próximas visitas y consulta tu historial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-muted rounded-xl p-6 space-y-6 lg:sticky lg:top-24">
              {/* Stats */}
              <div>
                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest block mb-1">
                  Total reservas
                </span>
                <span className="text-3xl font-bold text-primary">{appointments.length}</span>
              </div>

              <div className="h-px bg-border/40" />

              {/* Navigation */}
              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'upcoming'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <CalendarCheck className="h-4 w-4 shrink-0" />
                  Próximas
                  {upcomingList.length > 0 && (
                    <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      activeTab === 'upcoming' ? 'bg-white/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {upcomingList.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'past'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <History className="h-4 w-4 shrink-0" />
                  Historial
                </button>
              </nav>

              {/* Quick book CTA */}
              <div className="pt-2 border-t border-border/40">
                <Link
                  to="/book"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors"
                >
                  Nueva reserva
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-9 space-y-8">

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl h-28 animate-pulse border border-border/20" />
                ))}
              </div>
            ) : activeTab === 'upcoming' ? (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="text-xl font-bold text-foreground">Próximas visitas</h2>
                  {upcomingList.length > 0 && (
                    <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">
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
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section>
                <h2 className="text-xl font-bold text-muted-foreground mb-5">Historial reciente</h2>
                {pastList.length === 0 ? (
                  <EmptyState tab="past" />
                ) : (
                  <div className="space-y-3">
                    {pastList.map((apt) => (
                      <HistoryRow key={apt._id} appointment={apt} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      <CancelModal
        appointment={cancelTarget}
        horasMinimas={horasMinimas}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        isPending={cancelMutation.isPending}
      />
    </div>
  );
}
