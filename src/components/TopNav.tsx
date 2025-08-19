import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import OrgSwitcher from './OrgSwitcher';
import Button from './ui/Button';
import { useAuth } from '../state/AuthContext';

type Props = {
  showOrgSwitcher?: boolean;
  onLoginClick?: () => void;
  showNavLinks?: boolean; // hide on Landing
  showThemeToggle?: boolean; // hide or show
};

const TopNav: React.FC<Props> = ({ showOrgSwitcher, onLoginClick, showNavLinks = true, showThemeToggle = true }) => {
  const [dark, setDark] = useState(false);
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { tenant } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) => loc.pathname.startsWith(path);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-600">Ruteo</Link>
          {showNavLinks && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {[
                { label: 'Dashboard', href: `/${tenant ?? 'acme'}/app` },
                { label: 'Clientes', href: `/${tenant ?? 'acme'}/clients` },
                { label: 'Rutas', href: `/${tenant ?? 'acme'}/routes` },
                { label: 'Ajustes', href: `/${tenant ?? 'acme'}/settings` },
              ].map((it) => (
                <Link
                  key={it.href}
                  to={it.href}
                  className={[
                    'px-2 py-1 rounded-lg text-sm',
                    isActive(it.href) ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showOrgSwitcher && <OrgSwitcher />}
          {showThemeToggle && (
            <button
              aria-label="Cambiar tema"
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.classList.toggle('dark');
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                dark ? 'bg-sky-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-200 shadow-sm ${
                  dark ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          )}
          {!user ? (
            <Button
              size="sm"
              variant="pillGreen"
              className="h-8 px-3 py-0"
              onClick={() => (onLoginClick ? onLoginClick() : nav(`/${tenant ?? 'acme'}/login`))}
            >
              Ingresar
            </Button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm max-w-[140px] truncate">{user.email}</span>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-48 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => { setMenuOpen(false); nav(`/${tenant ?? 'acme'}/app`); }}
                  >
                    Ir al dashboard
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => { setMenuOpen(false); logout(); nav('/'); }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
