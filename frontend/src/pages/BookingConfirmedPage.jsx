import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, ArrowRight, MapPin } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { formatTimeInTz, formatFullDateInTz } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingConfirmedPage() {
  const { state } = useLocation();
  const { data: settings } = useSettings();

  const appointment = state?.appointment;

  // Si no hay datos de cita (acceso directo a la URL), redirigir
  if (!appointment) {
    return <Navigate to="/" replace />;
  }

  const businessName = settings?.nombreNegocio || 'Peluquería';
  const businessAddress = settings?.direccion || '';
  const businessTz = settings?.zonaHoraria || 'Europe/Madrid';

  // Parse appointment data
  const servicioNombre = appointment.servicio?.nombre ?? 'Servicio';
  const servicioDescripcion = appointment.servicio?.descripcion ?? '';
  const duracion = appointment.servicio?.duracion;
  const precio = appointment.precioFinal ?? appointment.servicio?.precio;
  const profesionalNombre = appointment.profesional?.nombre ?? 'Profesional';
  const profesionalColor = appointment.profesional?.color ?? '#6b38d4';
  const iniciales = profesionalNombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fechaInicio = appointment.fechaHoraInicio
    ? new Date(appointment.fechaHoraInicio)
    : null;
  const fechaFin = appointment.fechaHoraFin
    ? new Date(appointment.fechaHoraFin)
    : null;

  const dateLabel = fechaInicio
    ? formatFullDateInTz(fechaInicio, businessTz)
    : '';
  const timeStart = fechaInicio ? formatTimeInTz(fechaInicio, businessTz) : '';
  const timeEnd = fechaFin ? formatTimeInTz(fechaFin, businessTz) : '';

  return (
    <div className="bg-muted text-foreground min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
      <main className="w-full max-w-xl">

        {/* Success header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" style={{ animationDuration: '3s' }} />
            <CheckCircle
              className="h-12 w-12 text-primary"
              strokeWidth={1.5}
              style={{ fill: 'none' }}
            />
          </div>
          <h1 className="text-foreground text-4xl md:text-5xl font-extrabold tracking-display mb-4">
            ¡Reserva confirmada!
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-md">
            Tu cita está agendada. Te esperamos en {businessName}.
          </p>
        </div>

        {/* Appointment summary card */}
        <div className="bg-primary/5 rounded-xl p-1 overflow-hidden ambient-shadow mb-4">
          <div className="bg-card rounded-lg p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Service + Professional */}
              <div className="space-y-6">
                <div>
                  <span className="text-[0.65rem] uppercase tracking-[0.15em] font-bold text-primary mb-2 block">
                    El servicio
                  </span>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">{servicioNombre}</h2>
                  {servicioDescripcion && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{servicioDescripcion}</p>
                  )}
                  {duracion && (
                    <p className="text-xs text-muted-foreground mt-1">{formatDuration(duracion)}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                    style={{ backgroundColor: profesionalColor }}
                  >
                    {iniciales}
                  </div>
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.15em] font-bold text-muted-foreground block">
                      Profesional
                    </span>
                    <p className="text-lg font-semibold text-foreground">{profesionalNombre}</p>
                    {precio !== undefined && (
                      <span className="text-xs text-primary font-medium">{formatPrice(precio)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Date + Time + Status */}
              <div className="space-y-6 md:border-l md:border-border/20 md:pl-8">
                {fechaInicio && (
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-2 block">
                      Fecha de la cita
                    </span>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <p className="text-base font-semibold text-foreground capitalize">{dateLabel}</p>
                    </div>
                  </div>
                )}

                {timeStart && (
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-2 block">
                      Hora seleccionada
                    </span>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary shrink-0" />
                      <p className="text-base font-semibold text-foreground">
                        {timeStart}{timeEnd ? ` — ${timeEnd}` : ''}
                      </p>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground/60 mt-1 ml-8">
                      Zona horaria: {businessTz}
                    </p>
                  </div>
                )}

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Confirmada
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address mini-card */}
        {businessAddress && (
          <div className="bg-muted/80 rounded-xl p-4 flex items-center justify-between border border-border/20 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{businessName}</h4>
                <p className="text-xs text-muted-foreground">{businessAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/appointments"
            className="w-full sm:flex-1 bg-primary text-primary-foreground py-4 px-8 rounded-xl font-bold text-sm tracking-tight transition-all active:scale-95 flex items-center justify-center gap-2 group ambient-shadow hover:brightness-110"
          >
            Ver mis citas
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto border border-border/30 hover:bg-card text-muted-foreground py-4 px-8 rounded-xl font-bold text-sm tracking-tight transition-all active:scale-95 text-center"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Policy note */}
        <p className="mt-10 text-center text-[0.7rem] text-muted-foreground/60 font-medium leading-relaxed max-w-sm mx-auto">
          ¿Necesitas cancelar? Hazlo con al menos 24 horas de antelación para evitar cargos.
        </p>
      </main>

      {/* Floating brand footer */}
      <footer className="fixed bottom-6 text-center">
        <span className="text-xs font-black tracking-widest text-primary/20 uppercase">{businessName}</span>
      </footer>
    </div>
  );
}
