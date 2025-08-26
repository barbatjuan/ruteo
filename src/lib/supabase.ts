import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite requires VITE_ prefix for client-exposed envs
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Singleton para evitar múltiples instancias de GoTrueClient
let globalClient: SupabaseClient | null = null;
const tenantClients = new Map<string, SupabaseClient>();

/**
 * Obtiene un cliente Supabase configurado para el tenant especificado.
 * Implementa un patrón singleton para evitar múltiples instancias de GoTrueClient.
 * 
 * @param tenantUuid UUID del tenant para filtrado RLS
 * @returns Cliente Supabase configurado
 */
export function getSupabase(tenantUuid?: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno');
  }
  
  // Si no hay tenant, usamos un cliente global único
  if (!tenantUuid) {
    if (!globalClient) {
      globalClient = createSupabaseClient();
    }
    return globalClient;
  }
  
  // Para tenants, usamos un cliente por tenant
  const cached = tenantClients.get(tenantUuid);
  if (cached) return cached;
  
  const client = createSupabaseClient(tenantUuid);
  tenantClients.set(tenantUuid, client);
  return client;
}

/**
 * Crea un nuevo cliente Supabase con la configuración adecuada
 * @param tenantUuid UUID del tenant opcional
 */
function createSupabaseClient(tenantUuid?: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      // Importante: usar el header 'x-tenant-uuid' (minúsculas) para RLS.
      // Enviar solo una cabecera para evitar combinaciones "uuid, uuid" por el navegador
      headers: tenantUuid
        ? {
            'x-tenant-uuid': tenantUuid,
            // Header permitido por CORS de Supabase; lo aprovechamos para depurar
            'X-Client-Info': `ruteo;tenant_uuid=${tenantUuid}`,
          }
        : {},
      // Wrapper de fetch para depuración: ver los headers que realmente salen del navegador.
      fetch: (url, options) => {
        try {
          // Puede generar mucho ruido en consola; es temporal.
          // eslint-disable-next-line no-console
          if (typeof url === 'string') {
            const optHeaders = options?.headers ? new Headers(options.headers as any) : undefined;
            const headersObj: Record<string, string> = {};
            if (optHeaders) { optHeaders.forEach((v, k) => { headersObj[k] = v; }); }
            console.log('[supabase fetch]', url, options?.method || 'GET', headersObj);
          } else {
            const req = url as Request;
            const hObj: Record<string, string> = {};
            req.headers.forEach((v, k) => { hObj[k] = v; });
            console.log('[supabase fetch]', req.url, req.method, hObj);
          }
        } catch {}
        return fetch(url as any, options as any);
      },
    },
  });
}
