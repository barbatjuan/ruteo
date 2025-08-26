import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Link, useParams } from 'react-router-dom';
import { useTenant } from '../state/TenantContext';
import {
  countRoutesToday,
  countRoutesInProgress,
  getStopsStatsToday,
  activeDriversToday,
} from '../lib/routes';

const Dashboard: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { tenant } = useParams();
  const [loading, setLoading] = useState(false);
  const [routesToday, setRoutesToday] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [stopsTotal, setStopsTotal] = useState(0);
  const [stopsPending, setStopsPending] = useState(0);
  const [driversActive, setDriversActive] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!tenantUuid) return;
      setLoading(true);
      try {
        const [rToday, rProg, stops, drv] = await Promise.all([
          countRoutesToday(tenantUuid),
          countRoutesInProgress(tenantUuid),
          getStopsStatsToday(tenantUuid),
          activeDriversToday(tenantUuid),
        ]);
        setRoutesToday(rToday);
        setInProgress(rProg);
        setStopsTotal(stops.total);
        setStopsPending(stops.pending);
        setDriversActive(drv);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tenantUuid]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400">Resumen de tus operaciones de hoy</p>
          </div>
          <Link to={`/${tenant ?? 'acme'}/routes?tab=plan`}>
            <Button variant="pillGreen" className="rounded-lg">Nueva ruta</Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="p-4">
              <p className="text-sm text-slate-500">Rutas hoy</p>
              <p className="text-3xl font-semibold">{routesToday}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-slate-500">En progreso</p>
              <p className="text-3xl font-semibold">{inProgress}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-slate-500">Paradas totales</p>
              <p className="text-3xl font-semibold">{stopsTotal}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-slate-500">Paradas pendientes</p>
              <p className="text-3xl font-semibold">{stopsPending}</p>
            </div>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-slate-500">Drivers activos hoy</p>
              <p className="text-3xl font-semibold">{driversActive}</p>
            </div>
          </Card>
          {/* Espacio para widgets futuros: últimas rutas, rendimiento, etc. */}
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;

