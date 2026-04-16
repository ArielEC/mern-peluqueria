import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Scissors } from 'lucide-react';
import { z } from 'zod';
import { useLogin } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import useAuthStore from '@/stores/authStore';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Introduce un email válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// ─── Field component ─────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
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
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        className={`w-full pl-10 ${rightSlot ? 'pr-10' : 'pr-4'} py-3 bg-muted border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 font-medium transition-all outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useSettings();
  const { isAdmin } = useAuthStore();
  const loginMutation = useLogin();

  const [fields, setFields] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const businessName = settings?.nombreNegocio || 'Peluquería';
  const from = location.state?.from?.pathname;

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const result = loginSchema.safeParse(fields);
    if (!result.success) {
      const errors = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    loginMutation.mutate(result.data, {
      onSuccess: () => {
        const redirect = from || (isAdmin() ? '/admin' : '/book');
        navigate(redirect, { replace: true });
      },
    });
  }

  return (
    <div className="bg-muted text-foreground min-h-screen flex items-center justify-center p-6">
      <main className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6 shadow-lg shadow-primary/20">
            <Scissors className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-foreground text-2xl font-black tracking-display">
            {businessName}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/20 ambient-shadow rounded-xl overflow-hidden p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground">Bienvenido de nuevo</h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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

            <Field label="Contraseña" error={fieldErrors.password}>
              <IconInput
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={fields.password}
                onChange={handleChange}
                error={fieldErrors.password}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </Field>

            {/* API error */}
            {loginMutation.isError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 font-medium">
                {loginMutation.error?.response?.data?.error ||
                  loginMutation.error?.response?.data?.message ||
                  'Credenciales incorrectas. Inténtalo de nuevo.'}
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-4 bg-primary text-primary-foreground font-bold tracking-tight rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <span className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline transition-all">
              Regístrate aquí
            </Link>
          </p>
        </div>

      </main>
    </div>
  );
}
