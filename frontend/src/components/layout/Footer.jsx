import { Scissors, Phone, Mail, MapPin } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function Footer() {
  const { data: settings } = useSettings();

  const businessName = settings?.nombreNegocio || 'Peluquería';
  const telefono = settings?.telefono;
  const email = settings?.email;
  const direccion = settings?.direccion;

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <Scissors className="h-5 w-5 text-primary" />
              <span>{businessName}</span>
            </div>
            {settings?.mensajeBienvenida && (
              <p className="text-sm text-muted-foreground max-w-xs">
                {settings.mensajeBienvenida}
              </p>
            )}
          </div>

          {/* Contact */}
          {(telefono || email || direccion) && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Contacto
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {telefono && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <a href={`tel:${telefono}`} className="hover:text-foreground transition-colors">
                      {telefono}
                    </a>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <a href={`mailto:${email}`} className="hover:text-foreground transition-colors">
                      {email}
                    </a>
                  </li>
                )}
                {direccion && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{direccion}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Policy */}
          {settings?.politicaCancelacion && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Política de cancelación
              </h3>
              <p className="text-sm text-muted-foreground">
                {settings.politicaCancelacion}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
