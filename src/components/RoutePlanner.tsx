import React, { useEffect, useMemo, useState } from 'react';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import Button from './ui/Button';
import AddressForm from './AddressForm';
import StopsList from './StopsList';
import MapView from './MapView';
import RouteSummary from './RouteSummary';
import ClientPicker from './ClientPicker';
import { useRoute } from '../state/RouteContext';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { createRouteWithStops, listRoutesSB, verifyRouteExists } from '../lib/routes';
import { getSupabase } from '../lib/supabase';
import { listTeamMembers } from '../lib/supabaseClients';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

type Driver = { user_id: string; label: string };

const RoutePlanner: React.FC = () => {
  const [openPicker, setOpenPicker] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant } = useParams();
  const { tenantUuid } = useTenant();
  const { stops } = useRoute();
  const { success, error: showError } = useToast();

  const [routeName, setRouteName] = useState('Ruta sin nombre');
  const [routeDate, setRouteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [driver, setDriver] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!tenantUuid) return;
      const team = await listTeamMembers(tenantUuid);
      const allowed = team.filter((t) => ['Driver', 'Dispatcher', 'Admin', 'Owner'].includes(t.role));
      setDrivers(allowed.map((t) => ({ user_id: t.user_id, label: t.name || t.email || t.user_id })));
    };
    run();
  }, [tenantUuid]);

  const stopPayload = useMemo(() => stops.map((s, idx) => ({
    sequence: idx + 1,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
  })), [stops]);

  const canSave = routeName.trim().length > 0 && routeDate && stops.length > 0 && !!tenantUuid && !saving;

  const onSave = async () => {
    if (!tenantUuid) return;
    setSaving(true);
    try {
      // 1. Crear la ruta
      const result = await createRouteWithStops(tenantUuid, {
        name: routeName.trim(),
        date: routeDate,
        status: 'planned',
        assigned_to: driver || null,
      }, stopPayload);
      
      console.log('[RoutePlanner] Ruta creada:', result);
      
      // 2. Verificar que la ruta se haya creado correctamente usando RPC
      try {
        // Añadir un pequeño retraso para dar tiempo a que la transacción se complete
        console.log('[RoutePlanner] Esperando 500ms antes de verificar la ruta...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Usar la función RPC para verificar la ruta (evita problemas con RLS)
        const routeCreated = await verifyRouteExists(tenantUuid, result.route_id);
        
        if (routeCreated) {
          console.log('[RoutePlanner] Ruta verificada en DB:', routeCreated);
          // Verificar paradas insertadas para esta ruta
          try {
            const sb = getSupabase(tenantUuid);
            // Usar RPC con SECURITY DEFINER para contar paradas sin depender de RLS del cliente
            const { data: stopsCount, error: stopsCountError } = await sb.rpc('count_stops_for_route', {
              p_tenant: tenantUuid,
              p_route: result.route_id,
            });
            if (stopsCountError) {
              console.warn('[RoutePlanner] Error contando paradas (RPC):', stopsCountError.message);
            } else {
              console.log(`[RoutePlanner] Paradas insertadas para ruta ${result.route_id}:`, stopsCount);
              if (!stopsCount || stopsCount === 0) {
                showError('La ruta se creó pero no se insertaron paradas. Revisemos el formato de datos.');
              }
            }
          } catch (stopsCountEx) {
            console.warn('[RoutePlanner] Excepción al contar paradas:', stopsCountEx);
          }
        } else {
          console.warn('[RoutePlanner] La ruta no se encontró en la DB después de crearla');
          
          // Intentar obtener todas las rutas para depuración
          try {
            const routes = await listRoutesSB(tenantUuid);
            console.log('[RoutePlanner] Rutas disponibles:', routes.length);
            console.log('[RoutePlanner] IDs de rutas:', routes.map(r => r.id));
          } catch (listError) {
            console.error('[RoutePlanner] Error al listar rutas:', listError);
          }
        }
      } catch (verifyError) {
        console.error('[RoutePlanner] Error al verificar la ruta creada:', verifyError);
      }
      
      success('Ruta guardada correctamente');
      
      // 3. Ir a la pestaña de administrar con un parámetro adicional para forzar recarga
      const timestamp = new Date().getTime();
      navigate(`/${tenant ?? 'acme'}/routes?tab=manage&refresh=${timestamp}`);
    } catch (e: any) {
      console.error('[RoutePlanner] Error al guardar ruta:', e);
      
      // Mensajes de error específicos según el tipo de error
      if (e?.message?.includes('permisos')) {
        showError('No tienes permisos para crear rutas. Se requiere rol Owner o Admin.');
      } else if (e?.message?.includes('403')) {
        showError('Error de permisos (403). Verifica que tu sesión sea válida y tengas el rol adecuado.');
      } else {
        showError(e?.message || 'Error al guardar la ruta. Intenta nuevamente más tarde.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: name, date, driver, save */}
      <Card>
        <div className="p-4 grid md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre de la ruta</label>
            <input value={routeName} onChange={(e) => setRouteName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              placeholder="Ej: Reparto Lunes AM" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Fecha</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              />
              <Button
                type="button"
                variant="pillGray"
                className="rounded-lg whitespace-nowrap"
                onClick={() => setRouteDate(new Date().toISOString().slice(0,10))}
              >
                Hoy
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Conductor (opcional)</label>
            <select value={driver} onChange={(e) => setDriver(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500">
              <option value="">— Sin asignar —</option>
              {drivers.map((d) => (
                <option key={d.user_id} value={d.user_id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="flex md:justify-end">
            <Button variant="pillGreen" className="rounded-lg w-full md:w-auto" disabled={!canSave} onClick={onSave}>
              {saving ? 'Guardando…' : 'Guardar ruta'}
            </Button>
          </div>
        </div>
      </Card>
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

      <Card className="overflow-hidden">
        <MapView />
      </Card>

      <Card>
        <div className="p-4">
          <RouteSummary />
        </div>
      </Card>

      <ClientPicker open={openPicker} onClose={() => setOpenPicker(false)} />
    </div>
  );
};

export default RoutePlanner;
