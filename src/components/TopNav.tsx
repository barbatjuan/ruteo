import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import OrgSwitcher from './OrgSwitcher';
import Button from './ui/Button';

type Props = {
  showOrgSwitcher?: boolean;
  onLoginClick?: () => void;
  showNavLinks?: boolean; // hide on Landing
  showThemeToggle?: boolean; // hide or show
};

const TopNav: React.FC<Props> = ({ showOrgSwitcher, onLoginClick, showNavLinks = true, showThemeToggle = true }) => {
  const [dark, setDark] = useState(false);
  const { tenant } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) => loc.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
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
                setDark((d) => !d);
                document.documentElement.classList.toggle('dark');
              }}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dark ? '🌙' : '☀️'}
            </button>
          )}
          <Button size="sm" className="rounded-full shadow-soft px-4" onClick={() => onLoginClick ? onLoginClick() : nav(`/${tenant ?? 'acme'}/login`)}>Login</Button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
