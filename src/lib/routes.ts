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
};

export async function listRoutesSB(tenantUuid: string): Promise<RouteRow[]> {
  const sb = getSupabase(tenantUuid);
  let routes: RouteRow[] = [];
  
  // 1. Obtener las rutas usando RPC para evitar problemas con RLS
  try {
    // Llamar a la RPC actualizada que devuelve un conjunto de resultados (SETOF routes)
    const { data, error } = await sb.rpc('list_routes_v2', {
      p_tenant: tenantUuid
    });
    
    if (error) {
      console.error('[listRoutesSB] Error al obtener rutas con RPC:', error);
      throw error;
    }
    
    console.log('[listRoutesSB] Respuesta RPC:', data);
    
    // La respuesta debe ser un array de rutas
    if (Array.isArray(data)) {
      routes = data as RouteRow[];
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
  
  // 2. Obtener las paradas para todas las rutas
  const routeIds = routes.map((r: RouteRow) => r.id);
  const { data: stops, error: stopsError } = await sb
    .from('route_stops')
    .select('route_id, status')
    .in('route_id', routeIds);
  
  if (stopsError) {
    console.error('[listRoutesSB] Error al obtener paradas:', stopsError);
    // No lanzamos error, continuamos con las rutas sin info de paradas
  }
  
  // 3. Agregar información de paradas a cada ruta
  const routesWithStops = routes.map(route => {
    const routeStops = stops?.filter(s => s.route_id === route.id) || [];
    const totalStops = routeStops.length;
    const pendingStops = routeStops.filter(s => s.status === 'pending').length;
    const completedStops = routeStops.filter(s => s.status === 'completed').length;
    
    return {
      ...route,
      total_stops: totalStops,
      pending_stops: pendingStops,
      completed_stops: completedStops
    };
  });
  
  return routesWithStops;
}

export async function assignRouteToDriver(tenantUuid: string, routeId: string, userId: string | null) {
  const sb = getSupabase(tenantUuid);
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
      const { data, error } = await sb.rpc('create_route_with_stops', {
        p_tenant: tenantUuid,
        p_route_id: routeId,
        p_name: route.name,
        p_date: route.date,
        p_status: route.status ?? 'planned',
        p_assigned_to: route.assigned_to ?? null,
        p_stops: stops.map((s) => ({
          sequence: s.sequence,
          address: s.address,
          lat: s.lat,
          lng: s.lng
        }))
      });
      
      if (error) throw error;
      
      // Verificar la respuesta de la RPC
      console.log('[createRouteWithStops] Respuesta RPC:', data);
      
      // Si la RPC devuelve success=false, lanzar un error
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        throw new Error(data.error || 'Error desconocido en la función RPC');
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
