import { Link } from 'react-router-dom';
import { Scissors, Clock, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { data: settings, isLoading } = useSettings();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-background px-4 py-20 text-center md:py-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
              <Scissors className="h-8 w-8 text-primary" />
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="mx-auto h-10 w-64 animate-pulse rounded-lg bg-muted" />
              <div className="mx-auto h-5 w-80 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {settings?.nombreNegocio || 'Bienvenido'}
              </h1>
              {settings?.mensajeBienvenida && (
                <p className="mt-4 text-lg text-muted-foreground">
                  {settings.mensajeBienvenida}
                </p>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link to="/book">
                <Calendar className="mr-2 h-5 w-5" />
                Reservar cita
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/appointments">Ver mis citas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">¿Cómo funciona?</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Elige tu servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Selecciona el servicio que necesitas entre todas las opciones disponibles.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                Escoge fecha y hora
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consulta la disponibilidad en tiempo real y reserva el horario que más te convenga.
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scissors className="h-5 w-5 text-primary" />
                ¡Listo!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tu cita queda confirmada. Puedes gestionarla en cualquier momento desde tu perfil.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact info */}
      {settings && (settings.telefono || settings.email || settings.direccion) && (
        <section className="bg-muted/40 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center text-2xl font-bold">Encuéntranos</h2>
            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-8">
              {settings.telefono && (
                <a
                  href={`tel:${settings.telefono}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {settings.telefono}
                </a>
              )}
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  {settings.email}
                </a>
              )}
              {settings.direccion && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {settings.direccion}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
