import { Link, useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function NotFoundPage() {
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const businessName = settings?.nombreNegocio || 'Peluquería';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 text-center">
      {/* Decorative circle */}
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <Scissors className="h-10 w-10 text-primary" />
      </div>

      {/* Code */}
      <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary/40 mb-3">
        Error 404
      </p>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
        Página no encontrada
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground text-base sm:text-lg font-medium max-w-sm mb-10">
        La página que buscas no existe o ha sido movida.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
        <Link
          to="/"
          className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-primary/20"
        >
          Ir al inicio
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="w-full sm:w-auto border border-border/40 text-muted-foreground px-8 py-3 rounded-xl font-bold hover:bg-muted transition-all"
        >
          Volver atrás
        </button>
      </div>

      {/* Brand watermark */}
      <p className="mt-10 sm:absolute sm:bottom-8 text-xs font-black tracking-widest text-primary/20 uppercase">
        {businessName}
      </p>
    </div>
  );
}
