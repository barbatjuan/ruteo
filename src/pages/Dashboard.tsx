import React, { useState } from 'react';
import TopNav from '../components/TopNav';
import AddressForm from '../components/AddressForm';
import MapView from '../components/MapView';
import RouteSummary from '../components/RouteSummary';
import StopsList from '../components/StopsList';
import ClientPicker from '../components/ClientPicker';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const [openPicker, setOpenPicker] = useState(false);
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopNav showOrgSwitcher />
      <main className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-3 gap-4">
        <aside className="md:col-span-1 space-y-4">
          <Card>
            <SectionHeader title="Paradas">
              <Button size="sm" onClick={() => setOpenPicker(true)}>Agregar cliente</Button>
            </SectionHeader>
            <div className="p-4 pt-0">
              <AddressForm />
            </div>
          </Card>
          <Card>
            <SectionHeader title="Lista de paradas" />
            <div className="p-2">
              <StopsList />
            </div>
          </Card>
        </aside>
        <section className="md:col-span-2 space-y-4">
          <Card>
            <SectionHeader title="Mapa" />
            <div className="p-3">
              <MapView height="520px" />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <RouteSummary />
            </div>
          </Card>
        </section>
      </main>
      <ClientPicker open={openPicker} onClose={() => setOpenPicker(false)} />
    </div>
  );
};

export default Dashboard;
