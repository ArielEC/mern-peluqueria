import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

// ─── Service card skeleton ────────────────────────────────────────────────────

function ServiceCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-8 ambient-shadow border border-border/20 flex flex-col h-full animate-pulse">
      <div className="mb-6 flex justify-between items-start">
        <div className="h-5 w-24 bg-muted rounded-full" />
        <div className="h-5 w-12 bg-muted rounded" />
      </div>
      <div className="h-6 w-40 bg-muted rounded mb-3" />
      <div className="space-y-2 flex-grow mb-8">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-4/5 bg-muted rounded" />
      </div>
      <div className="h-4 w-24 bg-muted rounded" />
    </div>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ service }) {
  return (
    <div className="bg-card rounded-xl p-8 ambient-shadow border border-border/20 flex flex-col h-full">
      <div className="mb-6 flex justify-between items-start gap-4">
        {service.categoria && (
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0">
            {service.categoria}
          </span>
        )}
        {service.precio !== undefined && (
          <span className="text-primary font-bold text-xl shrink-0">
            {formatPrice(service.precio)}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{service.nombre}</h3>
      {service.descripcion && (
        <p className="text-muted-foreground text-sm mb-8 flex-grow leading-relaxed">
          {service.descripcion}
        </p>
      )}
      {!service.descripcion && <div className="flex-grow" />}
      {service.duracion && (
        <div className="flex items-center text-muted-foreground gap-2 text-xs font-medium">
          <Clock className="h-4 w-4 shrink-0" />
          {formatDuration(service.duracion)}
        </div>
      )}
    </div>
  );
}

// ─── Contact item ─────────────────────────────────────────────────────────────

function ContactItem({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-4">
      <div className="bg-primary/10 p-3 rounded-lg flex items-center justify-center h-12 w-12 shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h4 className="font-bold text-foreground text-sm">{label}</h4>
        <div className="text-muted-foreground text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: settings, isLoading: loadingSettings } = useSettings();
  const { data: services, isLoading: loadingServices } = useServices();

  const businessName = settings?.nombreNegocio || 'Peluquería';
  const welcomeMsg =
    settings?.mensajeBienvenida ||
    'Tu próxima transformación comienza aquí, en un espacio diseñado para la excelencia.';

  const activeServices = services?.filter((s) => s.activo !== false) ?? [];

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-background py-24 md:py-32">
        <div className="absolute inset-0 bg-muted/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10 flex flex-col items-center text-center">

          <span className="text-primary font-semibold tracking-widest text-xs uppercase mb-4 block">
            Bienvenido a
          </span>

          {loadingSettings ? (
            <div className="space-y-3 mb-10">
              <div className="mx-auto h-14 md:h-20 w-80 md:w-[500px] animate-pulse rounded-lg bg-muted" />
              <div className="mx-auto h-5 w-72 md:w-96 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-display text-foreground mb-6 max-w-4xl">
                {businessName}
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-10 font-light leading-relaxed">
                {welcomeMsg}
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild className="px-10 py-4 text-lg font-bold shadow-lg group">
              <Link to="/book">
                Reservar Cita
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="px-10 py-4 text-lg font-bold"
            >
              <a href="#servicios">Ver Servicios</a>
            </Button>
          </div>
        </div>

        {/* Hero image */}
        <div className="mt-20 px-6 md:px-8 max-w-5xl mx-auto">
          <div className="rounded-xl overflow-hidden ambient-shadow h-72 md:h-[400px] bg-gradient-to-br from-primary/20 via-primary/5 to-background flex items-center justify-center">
            <div className="text-center text-primary/30">
              <svg className="mx-auto h-24 w-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M7 3C4 3 4 5.5 4 5.5C4 8 6 9 8 9C9.5 9 10.5 8 11 7" />
                <path d="M17 3C20 3 20 5.5 20 5.5C20 8 18 9 16 9C14.5 9 13.5 8 13 7" />
                <path d="M11 7C11 8.5 11 10 12 11C13 12 14 12.5 14 14C14 15.5 13 16.5 12 17" />
                <path d="M13 7C13 8.5 13 10 12 11" />
                <circle cx="9" cy="19" r="2" />
                <circle cx="15" cy="19" r="2" />
                <path d="M10.5 18L12 17L13.5 18" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Services ── */}
      <section id="servicios" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8">

          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
                Servicios Destacados
              </h2>
              <p className="text-muted-foreground text-base">
                Seleccionamos cuidadosamente nuestros tratamientos más solicitados para ofrecerte resultados de nivel profesional.
              </p>
            </div>
            <Link
              to="/book"
              className="text-primary font-bold hover:underline flex items-center gap-1 text-sm shrink-0"
            >
              Ver todos los servicios
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingServices ? (
              <>
                <ServiceCardSkeleton />
                <ServiceCardSkeleton />
                <ServiceCardSkeleton />
              </>
            ) : activeServices.length > 0 ? (
              activeServices.slice(0, 6).map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No hay servicios disponibles en este momento.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      {settings && (settings.telefono || settings.email || settings.direccion) && (
        <section id="contacto" className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-8">
                  Encuéntranos
                </h2>
                <div className="space-y-8">
                  {settings.direccion && (
                    <ContactItem icon={MapPin} label="Dirección">
                      {settings.direccion}
                    </ContactItem>
                  )}
                  {settings.telefono && (
                    <ContactItem icon={Phone} label="Teléfono">
                      <a href={`tel:${settings.telefono}`} className="hover:text-foreground transition-colors">
                        {settings.telefono}
                      </a>
                    </ContactItem>
                  )}
                  {settings.email && (
                    <ContactItem icon={Mail} label="Correo Electrónico">
                      <a href={`mailto:${settings.email}`} className="hover:text-foreground transition-colors">
                        {settings.email}
                      </a>
                    </ContactItem>
                  )}
                </div>
              </div>

              {/* Decorative placeholder (mapa o imagen del local) */}
              <div className="rounded-xl overflow-hidden h-80 lg:h-[420px] ambient-shadow border border-border/20 bg-gradient-to-br from-primary/10 via-muted/50 to-muted flex items-center justify-center">
                <div className="text-center px-8">
                  <MapPin className="mx-auto h-12 w-12 text-primary/30 mb-3" />
                  {settings.direccion && (
                    <p className="text-muted-foreground text-sm">{settings.direccion}</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

    </div>
  );
}
