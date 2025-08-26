import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTenant } from '../state/TenantContext';
import { listRoutesSB, assignRouteToDriver, type RouteRow } from '../lib/routes';
import { listTeamMembers } from '../lib/supabaseClients';
import RoutePlanner from '../components/RoutePlanner';

type Driver = { user_id: string; email: string; name?: string };

// Función para obtener el estilo según el estado de la ruta
const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'planned':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'in_progress':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    case 'completed':
    case 'done':
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

const RoutesPage: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { tenant } = useParams();
  const [search, setSearch] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'plan' | 'manage'>(() => (search.get('tab') === 'plan' ? 'plan' : 'manage'));

  const driverOptions = useMemo(() => (
    [{ user_id: '', email: '— Sin asignar —' }, ...drivers]
  ), [drivers]);

  // Agregamos un estado para controlar la recarga de rutas
  const [refreshRoutes, setRefreshRoutes] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!tenantUuid) return;
      setLoading(true);
      try {
        const [rts, team] = await Promise.all([
          listRoutesSB(tenantUuid),
          listTeamMembers(tenantUuid).then(m => m.filter(mb => mb.role === 'Driver' || mb.role === 'Dispatcher' || mb.role === 'Owner' || mb.role === 'Admin')),
        ]);
        console.log('[Routes] Rutas cargadas:', rts.length);
        setRoutes(rts);
        setDrivers(team.map(t => ({ user_id: t.user_id, email: t.email || t.name || t.user_id, name: t.name })));
      } catch (error) {
        console.error('[Routes] Error al cargar rutas:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantUuid, refreshRoutes]);

  useEffect(() => {
    // keep URL in sync
    const current = search.get('tab');
    const desired = tab === 'plan' ? 'plan' : 'manage';
    if (current !== desired) {
      search.set('tab', desired);
      setSearch(search, { replace: true });
      
      // Si cambiamos a la pestaña de administrar, recargamos las rutas
      if (desired === 'manage') {
        setRefreshRoutes(prev => prev + 1);
      }
    }
  }, [tab, search, setSearch]);
  
  // Detectar el parámetro refresh en la URL para recargar las rutas
  useEffect(() => {
    const refreshParam = search.get('refresh');
    if (refreshParam && tab === 'manage') {
      console.log('[Routes] Recargando rutas por parámetro refresh:', refreshParam);
      setRefreshRoutes(prev => prev + 1);
      
      // Limpiar el parámetro refresh de la URL para evitar recargas innecesarias
      search.delete('refresh');
      setSearch(search, { replace: true });
    }
  }, [search, tab, setSearch]);

  const onAssign = async (routeId: string, userId: string) => {
    if (!tenantUuid) return;
    setAssigning((s) => ({ ...s, [routeId]: true }));
    try {
      await assignRouteToDriver(tenantUuid, routeId, userId || null);
      setRoutes((rs) => rs.map(r => r.id === routeId ? { ...r, assigned_to: userId || null } : r));
    } finally {
      setAssigning((s) => ({ ...s, [routeId]: false }));
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rutas</h1>
            <p className="text-slate-600 dark:text-slate-400">Asigna rutas a conductores y gestiona su estado</p>
          </div>
          {/* Future: botón crear ruta */}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg border text-sm ${tab === 'plan' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
            onClick={() => setTab('plan')}
          >
            Planificar
          </button>
          <button
            className={`px-4 py-2 rounded-lg border text-sm ${tab === 'manage' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
            onClick={() => setTab('manage')}
          >
            Administrar
          </button>
        </div>

        {tab === 'plan' && (
          <RoutePlanner />
        )}

        {tab === 'manage' && drivers.length === 0 && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">No tienes conductores aún</p>
                <p className="text-sm opacity-80">Invita a tu primer driver para poder asignar rutas.</p>
              </div>
              <Link
                to={`/${tenant ?? 'acme'}/team`}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Invitar driver
              </Link>
            </div>
          </div>
        )}

        {tab === 'manage' && (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Nombre</th>
                <th className="text-left font-semibold px-4 py-3">Fecha</th>
                <th className="text-left font-semibold px-4 py-3">Estado</th>
                <th className="text-left font-semibold px-4 py-3">Paradas</th>
                <th className="text-left font-semibold px-4 py-3">Conductor</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusStyle(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.total_stops !== undefined ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{r.total_stops} paradas</span>
                        </div>
                        {r.total_stops > 0 && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: `${r.completed_stops && r.total_stops ? (r.completed_stops / r.total_stops * 100) : 0}%` }}
                            ></div>
                          </div>
                        )}
                        {r.pending_stops !== undefined && r.completed_stops !== undefined && r.total_stops > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {r.completed_stops} completadas, {r.pending_stops} pendientes
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.assigned_to ?? ''}
                      onChange={(e) => onAssign(r.id, e.target.value)}
                      disabled={assigning[r.id] || loading}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {driverOptions.map((d) => (
                        <option key={d.user_id || 'none'} value={d.user_id}>{d.name || d.email}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay rutas aún</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </AppShell>
  );
};

export default RoutesPage;
