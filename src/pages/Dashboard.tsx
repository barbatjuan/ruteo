import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import AddressForm from '../components/AddressForm';
import MapView from '../components/MapView';
import RouteSummary from '../components/RouteSummary';
import StopsList from '../components/StopsList';
import ClientPicker from '../components/ClientPicker';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import { useRoute } from '../state/RouteContext';

const Dashboard: React.FC = () => {
  const [openPicker, setOpenPicker] = useState(false);
  const { clearStops, setOptimizeWaypoints } = useRoute();
  
  return (
    <AppShell>
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Gestiona tus rutas y optimiza entregas</p>
        </div>
        
        <div className="space-y-4">
          {/* AddressForm y StopsList en una fila */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <SectionHeader title="Configuración de ruta">
                <Button size="sm" variant="pillGreen" className="rounded-lg mb-2" onClick={() => setOpenPicker(true)}>Agregar cliente</Button>
              </SectionHeader>
              <div className="p-4 pt-0">
                <AddressForm />
              </div>
            </Card>
            
            <Card>
              <SectionHeader title="Lista de paradas" />
              <div className="p-4 pt-0">
                <StopsList />
              </div>
            </Card>
          </div>
          
          {/* Mapa full width */}
          <Card className="overflow-hidden">
            <MapView />
          </Card>

          {/* Resumen de ruta separado */}
          <Card>
            <div className="p-4">
              <RouteSummary />
            </div>
          </Card>
        </div>
      </div>
      <ClientPicker open={openPicker} onClose={() => setOpenPicker(false)} />
    </AppShell>
  );
};

export default Dashboard;

