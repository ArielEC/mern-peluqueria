import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function Footer() {
  const { data: settings } = useSettings();

  const businessName = settings?.nombreNegocio || 'Peluquería';
  const telefono = settings?.telefono;
  const email = settings?.email;
  const direccion = settings?.direccion;

  return (
    <footer className="w-full border-t border-primary/5 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">

          {/* Brand */}
          <div className="space-y-2 w-full md:w-auto">
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-foreground">
              <Scissors className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{businessName}</span>
            </div>
            {direccion && (
              <p className="text-xs text-muted-foreground break-words">{direccion}</p>
            )}
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
            </p>
          </div>

          {/* Contacto */}
          {(telefono || email) && (
            <div className="space-y-1 w-full md:w-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                Contacto
              </p>
              {telefono && (
                <a
                  href={`tel:${telefono}`}
                  className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">phone</span>
                  {telefono}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors break-all"
                >
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  {email}
                </a>
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex flex-col gap-1.5 w-full md:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
              Accesos
            </p>
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Inicio
            </Link>
            <Link to="/book" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Reservar cita
            </Link>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Acceder
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
