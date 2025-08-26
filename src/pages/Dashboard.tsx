import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import { Link, useParams } from 'react-router-dom';
import { useTenant } from '../state/TenantContext';
import { getDashboardStats, fetchRoutesInProgressWithNextStop, RouteInProgressItem } from '../lib/routes';

// Inline line icons (same visual language as sidebar). They inherit currentColor.
const IconBox = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7L12 12l8.7-5" />
  </svg>
);
const IconTruck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <path d="M10 17h4a4 4 0 0 0 4-4V7H6v6a4 4 0 0 0 4 4z" />
    <path d="M14 7h3l3 3v3h-6V7z" />
    <circle cx="7.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);
const IconCompass = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16.24 7.76L14 14l-6.24 2.24L10 10z" />
  </svg>
);
const IconHourglass = (props: React.SVGProps<SVGSVGElement>) => (
  // Rediseño con margen interno para evitar recortes en chips pequeños
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <rect x="6" y="3" width="12" height="18" rx="2" ry="2" fill="none" />
    <path d="M8 7c2 2 6 2 8 0" />
    <path d="M8 17c2-2 6-2 8 0" />
    <path d="M8 12h8" />
  </svg>
);
const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  // Reloj con margen interno para no recortar en chips pequeños
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);
const IconCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" {...props}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const Dashboard: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { tenant } = useParams();
  const [loading, setLoading] = useState(false);
  const [routesToday, setRoutesToday] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [stopsTotal, setStopsTotal] = useState(0);
  const [stopsPending, setStopsPending] = useState(0);
  const [routesInProgress, setRoutesInProgress] = useState<RouteInProgressItem[]>([]);

  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const run = async () => {
      if (!tenantUuid) return;
      setLoading(true);
      try {
        const stats = await getDashboardStats(tenantUuid);
        setRoutesToday(stats.routes_today);
        setInProgress(stats.in_progress);
        setStopsTotal(stats.stops_total_today);
        setStopsPending(stats.stops_pending_today);
        // fetch rutas en progreso con próxima parada (mismo día de hoy)
        const today = new Date().toISOString().slice(0, 10);
        const inProg = await fetchRoutesInProgressWithNextStop(tenantUuid, today);
        setRoutesInProgress(inProg);
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

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          <MetricCard
            title="Rutas de hoy"
            value={routesToday}
            variant="emerald"
            loading={loading}
            icon={<IconBox />}
          />
          <MetricCard
            title="En progreso"
            value={inProgress}
            variant="sky"
            loading={loading}
            icon={<IconTruck />}
          />
          <MetricCard
            title="Paradas totales"
            value={stopsTotal}
            variant="amber"
            loading={loading}
            icon={<IconCompass />}
          />
          <MetricCard
            title="Paradas pendientes"
            value={stopsPending}
            variant="rose"
            loading={loading}
            icon={<IconClock />}
          />
          <MetricCard
            title="Paradas completadas"
            value={Math.max(0, stopsTotal - stopsPending)}
            variant="slate"
            loading={loading}
            icon={<IconCheck />}
          />
        </div>

        {/* Acciones rápidas y placeholders de próximos widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900">Acciones rápidas</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/${tenant ?? 'acme'}/routes?tab=plan`}>
                  <Button variant="pillGreen" className="rounded-lg">Planificar nueva ruta</Button>
                </Link>
                <Link to={`/${tenant ?? 'acme'}/routes?tab=manage`}>
                  <Button variant="secondary" className="rounded-lg">Ver rutas de hoy</Button>
                </Link>
                <Link to={`/${tenant ?? 'acme'}/clients`}>
                  <Button variant="pillGray" className="rounded-lg">Añadir cliente</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Estado de operaciones</h3>
              <p className="text-sm text-slate-600">Todo listo. Puedes comenzar a asignar conductores y empezar rutas.</p>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Rutas en camino</h3>
              {routesInProgress.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No hay rutas en progreso ahora mismo.</p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700/70">
                  {routesInProgress.map((r) => (
                    <li key={r.route_id} className="py-3 flex items-start gap-3">
                      <div className="h-9 w-9 bg-sky-500/15 dark:bg-sky-400/10 ring-1 ring-sky-300 dark:ring-sky-700 text-sky-700 dark:text-sky-300 rounded-lg grid place-items-center">
                        <IconTruck />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{r.route_name}</p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">ETA regreso: {formatTime(r.estimated_return)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">Siguiente parada: {r.next_stop_address || '-'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">ETA próxima: {formatTime(r.next_stop_eta)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;

