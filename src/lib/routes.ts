import { getSupabase } from './supabase';
import { isAdmin } from './userRoles';

export type RouteRow = {
  id: string;
  tenant_uuid: string;
  name: string;
  date: string | null;
  status: 'draft' | 'planned' | 'in_progress' | 'done' | 'completed' | 'cancelled' | string;
  assigned_to: string | null;
  created_at: string;
  // Campos adicionales con información de paradas
  total_stops?: number;
  pending_stops?: number;
  completed_stops?: number;
  // minutos estimados para finalizar (basado en ETC de las paradas)
  eta_return_minutes?: number | null;
};

export async function listRoutesSB(tenantUuid: string): Promise<RouteRow[]> {
  const sb = getSupabase(tenantUuid);
  let routes: RouteRow[] = [];
  
  // 1. Obtener las rutas usando RPC para evitar problemas con RLS
  try {
    // Llamar a la RPC que ya devuelve agregados de paradas
    const { data, error } = await sb.rpc('list_routes_with_stats', {
      p_tenant: tenantUuid
    });
    
    if (error) {
      console.error('[listRoutesSB] Error al obtener rutas con RPC:', error);
      throw error;
    }
    
    console.log('[listRoutesSB] Respuesta RPC:', data);
    
    // La respuesta debe ser un array de rutas con stats
    if (Array.isArray(data)) {
      routes = (data as any[]).map((r) => ({
        id: r.id,
        tenant_uuid: r.tenant_uuid,
        name: r.name,
        date: r.date,
        status: r.status,
        assigned_to: r.assigned_to,
        created_at: r.created_at,
        total_stops: r.total_stops ?? 0,
        pending_stops: r.pending_stops ?? 0,
        completed_stops: r.completed_stops ?? 0,
        eta_return_minutes: null,
      } as RouteRow));
      console.log('[listRoutesSB] Rutas obtenidas con RPC:', routes.length);
    } else {
      console.warn('[listRoutesSB] La respuesta RPC no es un array');
      throw new Error('Formato de respuesta RPC inesperado');
    }
  } catch (rpcError) {
    // Fallback: intentar obtener las rutas directamente si la RPC falla
    console.warn('[listRoutesSB] RPC failed, falling back to direct query', rpcError);
    
    const { data: directRoutes, error: routesError } = await sb
      .from('routes')
      .select('id, tenant_uuid, name, date, status, assigned_to, created_at')
      .eq('tenant_uuid', tenantUuid)
      .order('created_at', { ascending: false });
    
    if (routesError) {
      console.error('[listRoutesSB] Error al obtener rutas:', routesError);
      throw routesError;
    }
    
    if (!directRoutes || directRoutes.length === 0) {
      console.log('[listRoutesSB] No se encontraron rutas en consulta directa');
      return [];
    }
    
    console.log('[listRoutesSB] Rutas obtenidas directamente:', directRoutes.length);
    routes = directRoutes;
  }
  
  // Si no hay rutas, devolvemos array vacío
  if (!routes || routes.length === 0) {
    console.log('[listRoutesSB] No se encontraron rutas');
    return [];
  }
  
  // 2. Ya tenemos stats si vino por RPC. Si vino por fallback directo, no hay stats.
  return routes;
}

export async function assignRouteToDriver(tenantUuid: string, routeId: string, userId: string | null) {
  const sb = getSupabase(tenantUuid);
  // 1) Intentar RPC SECURITY DEFINER si está instalada
  try {
    const { error } = await sb.rpc('assign_route_to_driver', {
      p_tenant: tenantUuid,
      p_route: routeId,
      p_user: userId,
    });
    if (!error) return;
    // Si PostgREST devuelve función no encontrada, caemos al update directo
    if ((error as any)?.code !== 'PGRST202') throw error;
  } catch (e) {
    // Ignorar si la función no existe; cualquier otro error se tratará en el fallback
    const msg = (e as any)?.code;
    if (msg && msg !== 'PGRST202') throw e;
  }

  // 2) Fallback: update directo (puede fallar por RLS si el rol no tiene permisos)
  const { error } = await sb
    .from('routes')
    .update({ assigned_to: userId })
    .eq('id', routeId);
  if (error) throw error;
}

// ==============================
// Create Route + Stops
// ==============================

export type CreateRouteInput = {
  name: string;
  date: string; // YYYY-MM-DD
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | string;
  assigned_to?: string | null;
};

export type CreateStopInput = {
  sequence: number;
  address: string;
  lat: number;
  lng: number;
};

export async function createRouteWithStops(
  tenantUuid: string,
  route: CreateRouteInput,
  stops: CreateStopInput[]
): Promise<{ route_id: string }> {
  // 1) Verificar que el usuario tenga permisos de administrador
  const hasAdminRole = await isAdmin(tenantUuid);
  if (!hasAdminRole) {
    throw new Error('No tienes permisos para crear rutas. Se requiere rol Owner o Admin.');
  }

  const sb = getSupabase(tenantUuid);
  
  try {
    // 2) Usar RPC para crear la ruta y sus paradas (evita problemas con RLS)
    const routeId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    
    // Primero intentamos con RPC (método preferido)
    try {
      const stopsPayload = stops.map((s) => ({
        sequence: s.sequence,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
      }));
      const pStopsText = JSON.stringify(stopsPayload);
      console.log('[createRouteWithStops] Payload stops length:', stopsPayload.length, 'text bytes:', pStopsText.length);

      // 1) Intentar v2 (jsonb)
      try {
        const { data, error } = await sb.rpc('create_route_with_stops_v2', {
          p_tenant: tenantUuid,
          p_route_id: routeId,
          p_name: route.name,
          p_date: route.date,
          p_status: route.status ?? 'planned',
          p_assigned_to: route.assigned_to ?? null,
          p_stops: stopsPayload, // jsonb directo
        });
        if (error) throw error;
        console.log('[createRouteWithStops] Respuesta RPC v2:', data);
        if (data && typeof data === 'object') {
          const anyData = data as any;
          if ('stops_param_len' in anyData || 'stops_inserted' in anyData) {
            console.log('[createRouteWithStops] Debug stops v2:', {
              stops_param_len: anyData.stops_param_len,
              stops_inserted: anyData.stops_inserted,
            });
          }
          if ('success' in anyData && anyData.success === false) {
            throw new Error(anyData.error || 'Error desconocido en la función RPC v2');
          }
        }
        return { route_id: routeId };
      } catch (v2err) {
        console.warn('[createRouteWithStops] RPC v2 failed, trying v1...', v2err);
      }

      // 2) Intentar v1 (TEXT stringify)
      const { data, error } = await sb.rpc('create_route_with_stops', {
        p_tenant: tenantUuid,
        p_route_id: routeId,
        p_name: route.name,
        p_date: route.date,
        p_status: route.status ?? 'planned',
        p_assigned_to: route.assigned_to ?? null,
        p_stops: pStopsText,
      });
      if (error) throw error;
      console.log('[createRouteWithStops] Respuesta RPC v1:', data);
      if (data && typeof data === 'object') {
        const anyData = data as any;
        if ('stops_param_len' in anyData || 'stops_inserted' in anyData) {
          console.log('[createRouteWithStops] Debug stops v1:', {
            stops_param_len: anyData.stops_param_len,
            stops_inserted: anyData.stops_inserted,
          });
        }
        if ('success' in anyData && anyData.success === false) {
          throw new Error(anyData.error || 'Error desconocido en la función RPC v1');
        }
      }
      return { route_id: routeId };
    } catch (rpcError) {
      console.warn('[createRouteWithStops] RPC failed, falling back to direct insert', rpcError);
      
      // Fallback: Inserción directa (puede fallar por RLS)
      const { error: re } = await sb
        .from('routes')
        .insert({
          id: routeId,
          tenant_uuid: tenantUuid,
          name: route.name,
          date: route.date,
          status: route.status ?? 'planned',
          assigned_to: route.assigned_to ?? null,
        });
      if (re) throw re;

      if (stops.length) {
        const payload = stops.map((s) => ({
          tenant_uuid: tenantUuid,
          route_id: routeId,
          sequence: s.sequence,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          status: 'pending',
        }));
        const { error: se } = await sb.from('route_stops').insert(payload);
        if (se) throw se;
      }

      return { route_id: routeId };
    }
  } catch (error) {
    console.error('[createRouteWithStops] Error:', error);
    throw error;
  }
}

// ==============================
// Metrics for Dashboard
// ==============================

/**
 * Verifica si una ruta existe usando RPC para evitar problemas con RLS
 * @param tenantUuid UUID del tenant
 * @param routeId ID de la ruta a verificar
 * @returns La ruta si existe, null si no existe
 */
export async function verifyRouteExists(tenantUuid: string, routeId: string): Promise<RouteRow | null> {
  const sb = getSupabase(tenantUuid);
  try {
    // Usar RPC para verificar la ruta (evita problemas con RLS)
    const { data, error } = await sb.rpc('get_route_by_id', {
      p_tenant: tenantUuid,
      p_route_id: routeId
    });
    
    if (error) throw error;
    console.log('[verifyRouteExists] Respuesta RPC:', data);
    
    // La RPC devuelve null si no existe la ruta
    if (!data) return null;
    
    return data as RouteRow;
  } catch (error) {
    console.error('[verifyRouteExists] Error:', error);
    // Fallback: intentar obtener la ruta directamente
    try {
      const { data } = await sb
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .eq('tenant_uuid', tenantUuid)
        .single();
      
      return data as RouteRow;
    } catch {
      return null;
    }
  }
}

export async function countRoutesToday(tenantUuid: string): Promise<number> {
  const sb = getSupabase(tenantUuid);
  const { count, error } = await sb
    .from('routes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_uuid', tenantUuid)
    .eq('date', new Date().toISOString().slice(0, 10));
  if (error) throw error;
  return count || 0;
}

export async function countRoutesInProgress(tenantUuid: string): Promise<number> {
  const sb = getSupabase(tenantUuid);
  const { count, error } = await sb
    .from('routes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_uuid', tenantUuid)
    .eq('date', new Date().toISOString().slice(0, 10))
    .in('status', ['planned', 'in_progress']);
  if (error) throw error;
  return count || 0;
}

export async function getStopsStatsToday(tenantUuid: string): Promise<{ total: number; pending: number }> {
  const sb = getSupabase(tenantUuid);
  // total
  const totalQ = sb
    .from('route_stops')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_uuid', tenantUuid)
    .gte('created_at', new Date().toISOString().slice(0, 10));
  // pending
  const pendingQ = sb
    .from('route_stops')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_uuid', tenantUuid)
    .eq('status', 'pending')
    .gte('created_at', new Date().toISOString().slice(0, 10));
  const [{ count: total, error: e1 }, { count: pending, error: e2 }] = await Promise.all([totalQ, pendingQ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { total: total || 0, pending: pending || 0 };
}

export async function activeDriversToday(tenantUuid: string): Promise<number> {
  const sb = getSupabase(tenantUuid);
  // Count distinct assigned_to for today's routes
  const { data, error } = await sb
    .from('routes')
    .select('assigned_to')
    .eq('tenant_uuid', tenantUuid)
    .eq('date', new Date().toISOString().slice(0, 10))
    .not('assigned_to', 'is', null);
  if (error) throw error;
  const ids = new Set((data as any[]).map(r => r.assigned_to).filter(Boolean));
  return ids.size;
}

// ==============================
// Dashboard aggregated stats via RPC (fallback to direct queries)
// ==============================

export async function getDashboardStats(tenantUuid: string): Promise<{
  routes_today: number;
  in_progress: number;
  stops_total_today: number;
  stops_pending_today: number;
  drivers_active_today: number;
}> {
  const sb = getSupabase(tenantUuid);
  const today = new Date().toISOString().slice(0, 10);
  // 1) Intentar RPC SECURITY DEFINER
  try {
    const { data, error } = await sb.rpc('dashboard_stats', {
      p_tenant: tenantUuid,
      p_date: today,
    });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as any;
      return {
        routes_today: Number(row.routes_today) || 0,
        in_progress: Number(row.in_progress) || 0,
        stops_total_today: Number(row.stops_total_today) || 0,
        stops_pending_today: Number(row.stops_pending_today) || 0,
        drivers_active_today: Number(row.drivers_active_today) || 0,
      };
    }
  } catch (e) {
    console.warn('[getDashboardStats] RPC failed, fallback to direct queries', e);
  }

  // 2) Fallback a consultas existentes
  const [rToday, rProg, stops, drv] = await Promise.all([
    countRoutesToday(tenantUuid),
    countRoutesInProgress(tenantUuid),
    getStopsStatsToday(tenantUuid),
    activeDriversToday(tenantUuid),
  ]);
  return {
    routes_today: rToday,
    in_progress: rProg,
    stops_total_today: stops.total,
    stops_pending_today: stops.pending,
    drivers_active_today: drv,
  };
}

// ==============================
// Routes in progress with next stop and ETA (RPC)
// ==============================

export interface RouteInProgressItem {
  route_id: string;
  route_name: string;
  assigned_to: string | null;
  status: string;
  next_stop_id: string | null;
  next_stop_sequence: number | null;
  next_stop_address: string | null;
  next_stop_eta: string | null; // ISO string
  estimated_return: string | null; // ISO string
}

export async function fetchRoutesInProgressWithNextStop(tenantUuid: string, dateISO: string): Promise<RouteInProgressItem[]> {
  const sb = getSupabase(tenantUuid);
  try {
    const { data, error } = await sb.rpc('routes_in_progress_with_next_stop', {
      p_tenant: tenantUuid,
      p_date: dateISO,
    });
    if (error) throw error;
    return (data as RouteInProgressItem[]) || [];
  } catch (e: any) {
    // Si la función no existe aún en el esquema cache (Supabase API), no romper el Dashboard
    if (e?.code === 'PGRST202' || e?.message?.includes('Could not find the function')) {
      console.warn('[fetchRoutesInProgressWithNextStop] RPC not found, returning empty list. Did you run SQL and reload API?');
      return [];
    }
    throw e;
  }
}
