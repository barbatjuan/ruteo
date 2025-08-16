import React from 'react';
import TopNav from '../components/TopNav';
import ClientList from '../components/ClientList';

const Clients: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <TopNav showOrgSwitcher />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ClientList />
      </main>
    </div>
  );
};

export default Clients;
