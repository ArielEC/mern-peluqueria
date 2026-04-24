import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Scissors } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import useAuthStore from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/book', label: 'Reservar' },
];

const authLinks = [
  { to: '/appointments', label: 'Mis citas' },
];


export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings } = useSettings();
  const { isAuthenticated, user } = useAuthStore();
  const logout = useLogout();

  const businessName = settings?.nombreNegocio || 'Peluquería';

  return (
    <header className="w-full top-0 sticky z-50 bg-background border-b border-border/40">
      <div className="flex justify-between items-center px-6 md:px-8 h-16 w-full max-w-7xl mx-auto">

        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold tracking-display text-foreground flex items-center gap-2 shrink-0"
        >
          <Scissors className="h-5 w-5 text-primary" />
          {businessName}
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex gap-8 items-center text-sm font-medium">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
                  : 'text-muted-foreground hover:text-primary transition-colors'
              }
            >
              {label}
            </NavLink>
          ))}
          {isAuthenticated &&
            authLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
                    : 'text-muted-foreground hover:text-primary transition-colors'
                }
              >
                {label}
              </NavLink>
            ))}
        </nav>

        {/* Auth actions desktop */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                  Panel Admin
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                {user?.nombre || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button size="sm" asChild className="px-6">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>

        {/* Hamburger mobile */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background px-6 pb-5 pt-3">
          <nav className="flex flex-col gap-1">
            {[...navLinks, ...(isAuthenticated ? authLinks : [])].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-bold text-primary bg-primary/10 text-center"
                  >
                    Panel Admin
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => { logout(); setMenuOpen(false); }}
                >
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <Button asChild onClick={() => setMenuOpen(false)}>
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
