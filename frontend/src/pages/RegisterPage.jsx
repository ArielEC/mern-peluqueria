import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, Scissors } from 'lucide-react';
import { z } from 'zod';
import { useRegister } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    email: z
      .string()
      .min(1, 'El email es obligatorio')
      .email('Introduce un email válido'),
    telefono: z
      .string()
      .regex(/^\+?[0-9]{9,15}$/, 'Teléfono inválido (9-15 dígitos)')
      .optional()
      .or(z.literal('')),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// ─── Shared input components ─────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}

function IconInput({ icon: Icon, error, rightSlot, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
      <input
        className={`block w-full pl-10 pr-${rightSlot ? '10' : '4'} py-3 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 font-medium transition-all outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
          error ? 'border-destructive' : 'border-border/30'
        }`}
        {...props}
      />
      {rightSlot && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const registerMutation = useRegister();

  const [fields, setFields] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const businessName = settings?.nombreNegocio || 'Peluquería';

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const result = registerSchema.safeParse(fields);
    if (!result.success) {
      const errors = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    const { confirmPassword, ...payload } = result.data;
    if (!payload.telefono) delete payload.telefono;

    registerMutation.mutate(payload, {
      onSuccess: () => navigate('/book', { replace: true }),
    });
  }

  return (
    <div className="bg-muted/50 text-foreground min-h-screen flex flex-col">

      {/* Minimal fixed header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-black tracking-display text-foreground uppercase">
              {businessName}
            </span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-xl bg-card rounded-xl p-8 md:p-12 ambient-shadow border border-border/20">

          {/* Form header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-foreground tracking-display mb-2">
              Crear cuenta
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Únete a {businessName} para reservar tus citas fácilmente.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Nombre — full width */}
            <Field label="Nombre completo" error={fieldErrors.nombre}>
              <IconInput
                icon={User}
                type="text"
                name="nombre"
                id="nombre"
                placeholder="Tu nombre completo"
                autoComplete="name"
                value={fields.nombre}
                onChange={handleChange}
                error={fieldErrors.nombre}
              />
            </Field>

            {/* Email + Teléfono — 2 cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Correo electrónico" error={fieldErrors.email}>
                <IconInput
                  icon={Mail}
                  type="email"
                  name="email"
                  id="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  value={fields.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                />
              </Field>
              <Field label="Teléfono" error={fieldErrors.telefono}>
                <IconInput
                  icon={Phone}
                  type="tel"
                  name="telefono"
                  id="telefono"
                  placeholder="612 345 678"
                  autoComplete="tel"
                  value={fields.telefono}
                  onChange={handleChange}
                  error={fieldErrors.telefono}
                />
              </Field>
            </div>

            {/* Password + Confirm — 2 cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Contraseña" error={fieldErrors.password}>
                <IconInput
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={fields.password}
                  onChange={handleChange}
                  error={fieldErrors.password}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </Field>
              <Field label="Confirmar contraseña" error={fieldErrors.confirmPassword}>
                <IconInput
                  icon={ShieldCheck}
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={fields.confirmPassword}
                  onChange={handleChange}
                  error={fieldErrors.confirmPassword}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </Field>
            </div>

            {/* API error */}
            {registerMutation.isError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 font-medium">
                {registerMutation.error?.response?.data?.message ||
                  'Error al crear la cuenta. Inténtalo de nuevo.'}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-bold tracking-tight shadow-lg shadow-primary/20 hover:brightness-110 hover:-translate-y-px active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? (
                <span className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline ml-1">
                Inicia sesión
              </Link>
            </p>
          </div>

        </div>
      </main>

      {/* Minimal footer */}
      <footer className="py-8 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
          <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link to="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
            <Link to="/condiciones" className="hover:text-primary transition-colors">Términos</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
