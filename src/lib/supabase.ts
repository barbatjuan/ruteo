import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite requires VITE_ prefix for client-exposed envs
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || (import.meta.env.SUPABASE_URL as string | undefined);
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || (import.meta.env.SUPABASE_ANON_KEY as string | undefined);

const cache = new Map<string, SupabaseClient>();

export function getSupabase(tenantId?: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno');
  }
  const key = tenantId || '__no_tenant__';
  const cached = cache.get(key);
  if (cached) return cached;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      // Importante: usar el header en minúsculas 'x-tenant-id'.
      // Mantenemos también la variante en mayúsculas por compatibilidad.
      headers: tenantId
        ? {
            'x-tenant-id': tenantId,
            'X-Tenant-Id': tenantId,
            // Header permitido por CORS de Supabase; lo aprovechamos para transportar el tenant
            'X-Client-Info': `ruteo;tenant=${tenantId}`,
          }
        : {},
      // Wrapper de fetch para depuración: ver los headers que realmente salen del navegador.
      fetch: (url, options) => {
        try {
          // Puede generar mucho ruido en consola; es temporal.
          // eslint-disable-next-line no-console
          console.debug('[supabase fetch]', url, options?.method || 'GET', options?.headers);
        } catch {}
        return fetch(url as any, options as any);
      },
    },
  });
  cache.set(key, client);
  return client;
}
