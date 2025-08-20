import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ClientList from '../components/ClientList';
import { useTenant } from '../state/TenantContext';
import { getSupabase } from '../lib/supabase';
// Estas envs deben existir en Vite
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

const Clients: React.FC = () => {
  return (
    <AppShell>
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Clientes</h1>
          <p className="text-slate-600 dark:text-slate-400">Gestiona tu base de clientes y direcciones</p>
        </div>
        
        <div>
          <ClientList />
        </div>

        <TenantDebugPanel />
      </div>
    </AppShell>
  );
};

function TenantDebugPanel() {
  const { tenantUuid, tenantLoading } = useTenant();
  const [serverSeenUuid, setServerSeenUuid] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [directSeenUuid, setDirectSeenUuid] = useState<string | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!tenantUuid) return;
      try {
        const sb = getSupabase(tenantUuid);
        const { data, error } = await sb.rpc('current_tenant_uuid');
        if (error) throw error;
        setServerSeenUuid((data as string) || null);
        setRpcError(null);
      } catch (e: any) {
        setRpcError(e?.message || 'RPC error');
        setServerSeenUuid(null);
      }
      // fetch directo con headers explícitos
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_tenant_uuid`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'content-type': 'application/json',
            // Header correcto para RLS
            'x-tenant-uuid': tenantUuid,
            'X-Tenant-UUID': tenantUuid,
            // CORS-safe header permitido por Supabase: usamos como fallback
            'X-Client-Info': `ruteo;tenant_uuid=${tenantUuid}`,
          } as any,
          body: '{}',
        });
        const text = await res.text();
        // Intentar parsear, si no, mostrar texto crudo
        try {
          const json = JSON.parse(text);
          setDirectSeenUuid((json as any) ?? null);
        } catch {
          setDirectSeenUuid(text || null);
        }
        setDirectError(null);
      } catch (e: any) {
        setDirectError(e?.message || 'Direct fetch error');
        setDirectSeenUuid(null);
      }
    })();
  }, [tenantUuid]);

  return (
    <div className="mt-6 text-xs text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3">
      <div><strong>Tenant UUID (cliente):</strong> {tenantLoading ? 'Resolviendo…' : (tenantUuid || 'null')}</div>
      <div><strong>current_tenant_uuid() (servidor):</strong> {serverSeenUuid ?? 'null'} {rpcError ? ` | error: ${rpcError}` : ''}</div>
      <div><strong>current_tenant_uuid() (fetch directo):</strong> {directSeenUuid ?? 'null'} {directError ? ` | error: ${directError}` : ''}</div>
      <div className="opacity-70">Este panel es temporal para depurar el header X-Tenant-UUID.</div>
    </div>
  );
}

export default Clients;
