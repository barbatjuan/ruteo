import React from 'react';
import TopNav from '../components/TopNav';
import AddressForm from '../components/AddressForm';
import MapView from '../components/MapView';
import RouteSummary from '../components/RouteSummary';
import StopsList from '../components/StopsList';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopNav showOrgSwitcher />
      <main className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-3 gap-4">
        <aside className="md:col-span-1 space-y-4">
          <AddressForm />
          <StopsList />
        </aside>
        <section className="md:col-span-2">
          <MapView height="520px" />
          <RouteSummary />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
