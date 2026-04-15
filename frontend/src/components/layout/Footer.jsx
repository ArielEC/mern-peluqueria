import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

const footerLinks = [
  { label: 'Contacto', to: '/#contacto' },
  { label: 'Política de privacidad', to: '/privacidad' },
  { label: 'Condiciones de uso', to: '/condiciones' },
  { label: 'Política de reservas', to: '/politica-reservas' },
];

export default function Footer() {
  const { data: settings } = useSettings();

  const businessName = settings?.nombreNegocio || 'Peluquería';

  return (
    <footer className="w-full border-t border-primary/5 bg-background">
      <div className="flex flex-col md:flex-row justify-between items-center py-10 px-6 md:px-8 w-full max-w-7xl mx-auto gap-6">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-1">
            <Scissors className="h-4 w-4 text-primary" />
            {businessName}
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap gap-6 justify-center">
          {footerLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-xs text-muted-foreground hover:underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
