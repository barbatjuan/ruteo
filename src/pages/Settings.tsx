import React from 'react';
import TopNav from '../components/TopNav';

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <TopNav showOrgSwitcher />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p>Placeholders: Web Push, Billing, Teams/Projects, i18n.</p>
      </main>
    </div>
  );
};

export default Settings;
