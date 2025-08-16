import React from 'react';
import TopNav from '../components/TopNav';

const RoutesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <TopNav showOrgSwitcher />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Rutas recientes</h1>
        <p className="text-slate-600 dark:text-slate-300">Historial mock. Próximamente: filtros, duplicar, etc.</p>
      </main>
    </div>
  );
};

export default RoutesPage;
