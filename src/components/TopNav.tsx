import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import OrgSwitcher from './OrgSwitcher';

const TopNav: React.FC<{ showOrgSwitcher?: boolean }> = ({ showOrgSwitcher }) => {
  const [dark, setDark] = useState(false);
  const { tenant } = useParams();
  const nav = useNavigate();

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-extrabold text-sky-600">Ruteo</Link>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="ml-2 flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link to={`/${tenant ?? 'acme'}/app`} className="px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Dashboard</Link>
              <Link to={`/${tenant ?? 'acme'}/clients`} className="px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Clientes</Link>
              <Link to={`/${tenant ?? 'acme'}/routes`} className="px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Rutas</Link>
              <Link to={`/${tenant ?? 'acme'}/settings`} className="px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Ajustes</Link>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showOrgSwitcher && <OrgSwitcher />}
          <button
            aria-label="Cambiar tema"
            className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800"
            onClick={() => {
              setDark((d) => !d);
              document.documentElement.classList.toggle('dark');
            }}
          >
            {dark ? '🌙' : '☀️'}
          </button>
          <button className="px-3 py-1 rounded-xl bg-sky-600 text-white" onClick={() => nav(`/${tenant ?? 'acme'}/login`)}>Login</button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
