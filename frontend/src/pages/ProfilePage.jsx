import { useMemo, useState } from 'react';
import { z } from 'zod';
import { KeyRound, Mail, Phone, Save, ShieldCheck, User2 } from 'lucide-react';
import { useChangePassword, useMe, useUpdateProfile } from '@/hooks/useAuth';
import { notifyValidationError } from '@/lib/notifications';
import useAuthStore from '@/stores/authStore';

const profileSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres').trim(),
  telefono: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{9,15}$/.test(value), 'El teléfono debe tener entre 9 y 15 dígitos'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres').max(100, 'La nueva contraseña no puede exceder 100 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser distinta a la actual',
  path: ['newPassword'],
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

function Field({ label, icon: Icon, error, hint, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-foreground flex items-center gap-2 text-sm font-bold">
        {Icon && <Icon className="text-primary h-4 w-4" />}
        {label}
      </span>
      {children}
      {hint && !error && <span className="text-muted-foreground text-xs">{hint}</span>}
      {error && <span className="text-destructive text-xs font-medium">{error}</span>}
    </label>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { data: meData, isLoading } = useMe();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const account = meData?.user || user;
  const [profileForm, setProfileForm] = useState(() => ({
    nombre: user?.nombre || '',
    telefono: user?.telefono || '',
  }));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const profileChanged = useMemo(() => {
    if (!account) return false;

    return (
      profileForm.nombre.trim() !== (account.nombre || '').trim()
      || profileForm.telefono.trim() !== (account.telefono || '').trim()
    );
  }, [account, profileForm]);

  function setProfileField(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => ({ ...current, [key]: undefined, api: undefined }));
  }

  function setPasswordField(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
    setPasswordErrors((current) => ({ ...current, [key]: undefined, api: undefined }));
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    const parsed = profileSchema.safeParse({
      nombre: profileForm.nombre,
      telefono: profileForm.telefono,
    });

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setProfileErrors(nextErrors);
      notifyValidationError(nextErrors, 'No se ha podido actualizar el perfil');
      return;
    }

    const payload = {
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono || null,
    };

    updateProfileMutation.mutate(payload, {
      onError: (error) => {
        setProfileErrors({ api: error?.response?.data?.error || 'Error al actualizar el perfil' });
      },
    });
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    const parsed = passwordSchema.safeParse(passwordForm);

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setPasswordErrors(nextErrors);
      notifyValidationError(nextErrors, 'No se ha podido cambiar la contraseña');
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      {
        onError: (error) => {
          setPasswordErrors({ api: error?.response?.data?.error || 'Error al cambiar la contraseña' });
        },
      }
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="mb-10">
          <h1 className="text-foreground mb-2 text-3xl font-extrabold tracking-display md:text-4xl">
            Mi perfil
          </h1>
          <p className="text-muted-foreground font-medium">
            Actualiza tus datos de contacto y gestiona la seguridad de tu cuenta.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <aside className="xl:col-span-1">
            <div className="bg-muted space-y-5 rounded-2xl p-6">
              <div className="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black">
                {account?.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '??'}
              </div>
              <div>
                <h2 className="text-foreground text-xl font-bold">{account?.nombre || 'Tu cuenta'}</h2>
                <p className="text-muted-foreground mt-1 text-sm break-all">{account?.email || '—'}</p>
              </div>
              <div className="bg-border/40 h-px" />
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold">Email</p>
                    <p className="text-muted-foreground break-all">{account?.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold">Teléfono</p>
                    <p className="text-muted-foreground">{account?.telefono || 'No indicado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-8 xl:col-span-2">
            <section className="ambient-shadow bg-card rounded-2xl border border-border/20 p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl shrink-0">
                  <User2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground text-xl font-bold">Datos de contacto</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Aquí puedes cambiar tu nombre y teléfono. El email solo se muestra como referencia.
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    label="Nombre completo"
                    icon={User2}
                    error={profileErrors.nombre?.[0]}
                  >
                    <input
                      className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full rounded-xl border-0 px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                      value={profileForm.nombre}
                      onChange={(event) => setProfileField('nombre', event.target.value)}
                      placeholder="Tu nombre completo"
                    />
                  </Field>

                  <Field
                    label="Teléfono"
                    icon={Phone}
                    error={profileErrors.telefono?.[0]}
                    hint="Opcional · 9 a 15 dígitos"
                  >
                    <input
                      className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full rounded-xl border-0 px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                      value={profileForm.telefono}
                      onChange={(event) => setProfileField('telefono', event.target.value)}
                      placeholder="612345678"
                      inputMode="tel"
                    />
                  </Field>
                </div>

                <Field label="Email" icon={Mail} hint="El email no se puede cambiar desde esta pantalla">
                  <input
                    className="bg-muted text-muted-foreground w-full rounded-xl border-0 px-4 py-3 text-sm outline-none"
                    value={account?.email || ''}
                    disabled
                  />
                </Field>

                {profileErrors.api && (
                  <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium">
                    {profileErrors.api}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending || !profileChanged || isLoading}
                    className="bg-primary text-primary-foreground hover:brightness-110 disabled:bg-primary/40 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isPending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar cambios
                  </button>
                </div>
              </form>
            </section>

            <section className="ambient-shadow bg-card rounded-2xl border border-border/20 p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground text-xl font-bold">Seguridad</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Para cambiar tu contraseña necesitaremos la actual. Tras hacerlo tendrás que iniciar sesión de nuevo.
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                <Field
                  label="Contraseña actual"
                  icon={KeyRound}
                  error={passwordErrors.currentPassword?.[0]}
                >
                  <input
                    type="password"
                    className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full rounded-xl border-0 px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                    autoComplete="current-password"
                    placeholder="Introduce tu contraseña actual"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    label="Nueva contraseña"
                    icon={ShieldCheck}
                    error={passwordErrors.newPassword?.[0]}
                    hint="Mínimo 6 caracteres"
                  >
                    <input
                      type="password"
                      className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full rounded-xl border-0 px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordField('newPassword', event.target.value)}
                      autoComplete="new-password"
                      placeholder="Nueva contraseña"
                    />
                  </Field>

                  <Field
                    label="Confirmar nueva contraseña"
                    icon={ShieldCheck}
                    error={passwordErrors.confirmPassword?.[0]}
                  >
                    <input
                      type="password"
                      className="bg-primary/10 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full rounded-xl border-0 px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                      autoComplete="new-password"
                      placeholder="Repite la nueva contraseña"
                    />
                  </Field>
                </div>

                {passwordErrors.api && (
                  <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium">
                    {passwordErrors.api}
                  </div>
                )}

                <div className="bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground">
                  Cuando cambies la contraseña se cerrará tu sesión actual para proteger la cuenta.
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending || isLoading}
                    className="bg-primary text-primary-foreground hover:brightness-110 disabled:bg-primary/40 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed"
                  >
                    {changePasswordMutation.isPending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Cambiar contraseña
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
