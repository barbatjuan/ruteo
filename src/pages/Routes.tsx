import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTenant } from '../state/TenantContext';
import { listRoutesSB, assignRouteToDriver, type RouteRow, deleteRouteSB, fetchRouteStopsSB, updateRouteStopsSB, type RouteStopRow } from '../lib/routes';
import { listTeamMembers } from '../lib/supabaseClients';
import RoutePlanner from '../components/RoutePlanner';
import { useToast } from '../state/ToastContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

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

// Etiqueta amigable en ES (capitalizada) para el estado
const getStatusLabel = (status?: string | null) => {
  switch ((status || '').toLowerCase()) {
    case 'planned':
      return 'Planificada';
    case 'pending':
      return 'Pendiente';
    case 'in_progress':
      return 'En recorrido';
    case 'completed':
    case 'done':
      return 'Completada';
    case 'cancelled':
      return 'Cancelada';
    case 'draft':
      return 'Borrador';
    default:
      return status || '';
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
  const [editingAssign, setEditingAssign] = useState<Record<string, boolean>>({});
  const [assignDraft, setAssignDraft] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'plan' | 'manage'>(() => (search.get('tab') === 'plan' ? 'plan' : 'manage'));
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const { info, success } = useToast();

  // Editor de paradas
  type EditStop = { id?: string; address: string | null; lat: number; lng: number; sequence: number };
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [editRouteName, setEditRouteName] = useState<string>('');
  const [editStops, setEditStops] = useState<EditStop[]>([]);

  const shortId = (id: string) => id ? id.slice(0, 8) : '';
  const driverOptions = useMemo(() => (
    [{ user_id: '', email: '— Sin asignar —', name: '— Sin asignar —' }, ...drivers]
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
        setDrivers(team.map(t => ({
          user_id: t.user_id,
          email: t.email || t.name || t.user_id,
          name: t.name || undefined,
        })));
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
      // salir de modo edición para esa fila
      setEditingAssign((s) => ({ ...s, [routeId]: false }));
      setAssignDraft((s) => ({ ...s, [routeId]: userId }));
    } finally {
      setAssigning((s) => ({ ...s, [routeId]: false }));
    }
  };

  const beginEditAssign = (routeId: string) => {
    const current = routes.find(r => r.id === routeId)?.assigned_to ?? '';
    setAssignDraft((s) => ({ ...s, [routeId]: current }));
    setEditingAssign((s) => ({ ...s, [routeId]: true }));
  };

  const cancelEditAssign = (routeId: string) => {
    setEditingAssign((s) => ({ ...s, [routeId]: false }));
    setAssignDraft((s) => ({ ...s, [routeId]: routes.find(r => r.id === routeId)?.assigned_to ?? '' }));
  };

  const canModify = (status: string | undefined | null) => {
    const s = (status || '').toLowerCase();
    return s === 'planned' || s === 'pending' || s === 'draft';
  };

  const onDelete = async (routeId: string) => {
    if (!tenantUuid) {
      // Usar toast para feedback visible
      info('No se pudo identificar el tenant. Recarga la página e inténtalo nuevamente.');
      console.warn('[Routes] onDelete sin tenantUuid');
      return;
    }
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    if (!canModify(route.status)) {
      alert('Solo se pueden eliminar rutas en estado borrador/planificada/pending.');
      return;
    }
    const ok = window.confirm(`¿Eliminar la ruta "${route.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setDeleting((s) => ({ ...s, [routeId]: true }));
    try {
      await deleteRouteSB(tenantUuid, routeId);
      // refrescar lista
      setRoutes((rs) => rs.filter(r => r.id !== routeId));
      success('Ruta eliminada correctamente');
    } catch (e) {
      console.error('[Routes] Error al eliminar ruta', e);
      info('No se pudo eliminar la ruta. Verifica permisos y estado.');
    } finally {
      setDeleting((s) => ({ ...s, [routeId]: false }));
    }
  };

  const onEditStops = async (routeId: string) => {
    console.log('[Routes] Editar paradas click', routeId);
    const r = routes.find(rt => rt.id === routeId);
    if (!r) return;
    if (!canModify(r.status)) {
      info('Solo se pueden editar paradas si la ruta está en Borrador/Planificada/Pendiente.');
      return;
    }
    if (!tenantUuid) {
      info('No se pudo identificar el tenant.');
      return;
    }
    setEditOpen(true);
    setEditLoading(true);
    setEditRouteId(routeId);
    setEditRouteName(r.name);
    try {
      const stops = await fetchRouteStopsSB(tenantUuid, routeId);
      const mapped: EditStop[] = (stops || []).map((s: RouteStopRow) => ({
        id: s.id,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        sequence: s.sequence,
      }));
      setEditStops(mapped);
    } catch (e) {
      console.error('[Routes] Error al cargar paradas', e);
      info('No se pudieron cargar las paradas de la ruta.');
    } finally {
      setEditLoading(false);
    }
  };

  const addEditRow = () => setEditStops((s) => [...s, { address: '', lat: 0, lng: 0, sequence: (s[s.length - 1]?.sequence ?? 0) + 1 }]);
  const removeEditRow = (idx: number) => setEditStops((s) => s.filter((_, i) => i !== idx));
  const setEditField = (idx: number, field: keyof EditStop, value: any) =>
    setEditStops((s) => s.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const saveEditStops = async () => {
    if (!tenantUuid || !editRouteId) return;
    setEditSaving(true);
    try {
      // Normalizar y ordenar por sequence
      const normalized = [...editStops]
        .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
        .map((s, i) => ({
          id: s.id,
          address: s.address ?? null,
          lat: Number(s.lat),
          lng: Number(s.lng),
          sequence: Number(s.sequence) || i + 1,
        }))
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((s, i) => ({ ...s, sequence: i + 1 }));

      await updateRouteStopsSB(tenantUuid, editRouteId, normalized);
      success('Paradas actualizadas');
      // Refrescar contador en la tabla (simplemente refetch rutas)
      setRefreshRoutes((n) => n + 1);
      setEditOpen(false);
    } catch (e) {
      console.error('[Routes] Error guardando paradas', e);
      info('No se pudieron guardar las paradas.');
    } finally {
      setEditSaving(false);
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
                <th className="text-right font-semibold px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusStyle(r.status)}`}>
                      {getStatusLabel(r.status)}
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
                            {r.completed_stops} completadas, {r.pending_stops} pendientes{r.eta_return_minutes != null ? ` · ETA regreso: ${r.eta_return_minutes} min` : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!editingAssign[r.id] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 dark:text-slate-300">
                          {drivers.find(d => d.user_id === r.assigned_to)?.name || drivers.find(d => d.user_id === r.assigned_to)?.email || '— Sin asignar —'}
                        </span>
                        <button
                          className="px-2 py-1 rounded-md border text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => beginEditAssign(r.id)}
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={assignDraft[r.id] ?? (r.assigned_to ?? '')}
                          onChange={(e) => setAssignDraft((s) => ({ ...s, [r.id]: e.target.value }))}
                          disabled={assigning[r.id] || loading}
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          {r.assigned_to && !drivers.some(d => d.user_id === r.assigned_to) && (
                            <option value={r.assigned_to}>{shortId(r.assigned_to)}</option>
                          )}
                          {driverOptions.map((d) => (
                            <option key={d.user_id || 'none'} value={d.user_id}>
                              {d.user_id ? (d.name || (d.email ? d.email.split('@')[0] : shortId(d.user_id))) : (d.name || d.email)}
                            </option>
                          ))}
                        </select>
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => onAssign(r.id, assignDraft[r.id] ?? '')}
                          disabled={assigning[r.id]}
                          title="Guardar"
                        >
                          {assigning[r.id] ? <span className="animate-pulse">…</span> : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          )}
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => cancelEditAssign(r.id)}
                          title="Cancelar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-md border text-xs ${canModify(r.status) ? 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                        disabled={!canModify(r.status)}
                        onClick={() => onEditStops(r.id)}
                      >
                        Editar paradas
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-md text-xs ${canModify(r.status) ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-200 text-white/70 cursor-not-allowed'}`}
                        disabled={!canModify(r.status) || deleting[r.id]}
                        onClick={() => onDelete(r.id)}
                        title="Eliminar ruta"
                      >
                        {deleting[r.id] ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay rutas todavía</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal editor de paradas */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Editar paradas · ${editRouteName}`}>
        <div className="p-4 space-y-4">
          {editLoading ? (
            <div className="text-sm text-slate-500">Cargando paradas…</div>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-2 py-1 w-16">#</th>
                      <th className="px-2 py-1">Dirección</th>
                      <th className="px-2 py-1 w-28">Lat</th>
                      <th className="px-2 py-1 w-28">Lng</th>
                      <th className="px-2 py-1 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editStops.map((s, idx) => (
                      <tr key={idx} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            value={s.sequence}
                            onChange={(e) => setEditField(idx, 'sequence', Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={s.address ?? ''}
                            onChange={(e) => setEditField(idx, 'address', e.target.value)}
                            placeholder="Dirección"
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="any"
                            value={s.lat}
                            onChange={(e) => setEditField(idx, 'lat', Number(e.target.value))}
                            className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="any"
                            value={s.lng}
                            onChange={(e) => setEditField(idx, 'lng', Number(e.target.value))}
                            className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            className="text-red-600 hover:underline text-xs"
                            onClick={() => removeEditRow(idx)}
                            title="Eliminar parada"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {editStops.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-8 text-center text-slate-500">Sin paradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" variant="pillGray" className="rounded-lg" onClick={addEditRow}>Agregar parada</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="pillGray" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancelar</Button>
                  <Button type="button" variant="pillGreen" className="rounded-lg" disabled={editSaving} onClick={saveEditStops}>
                    {editSaving ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  );
};

export default RoutesPage;
