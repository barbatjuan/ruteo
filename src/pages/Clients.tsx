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
  const [rawClients, setRawClients] = useState<any[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [userJwtClients, setUserJwtClients] = useState<any[] | null>(null);
  const [userJwtClientsErr, setUserJwtClientsErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!tenantUuid) return;
      try {
        const sb = getSupabase(tenantUuid);
        // Validar el header a través de una consulta normal con RLS
        const { data, error } = await sb.from('tenants').select('uuid_id').limit(1);
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : (data as any);
        setServerSeenUuid(row?.uuid_id || null);
        setRpcError(null);
      } catch (e: any) {
        setRpcError(e?.message || 'Select error');
        setServerSeenUuid(null);
      }
      // Cargar clientes crudos directamente desde la DB (sin embeds)
      try {
        const sb = getSupabase(tenantUuid);
        const { data: cdata, error: cerr } = await sb
          .from('clients')
          .select('id, name, phone, notes')
          .eq('tenant_uuid', tenantUuid)
          .order('created_at', { ascending: true });
        if (cerr) throw cerr;
        setRawClients(Array.isArray(cdata) ? cdata : []);
        setClientsError(null);
      } catch (e: any) {
        setClientsError(e?.message || 'Clients select error');
        setRawClients(null);
      }
      // fetch directo con headers explícitos
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=uuid_id`, {
          method: 'GET',
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
        });
        const json = await res.json();
        setDirectSeenUuid((json?.[0]?.uuid_id as any) ?? null);
        setDirectError(null);
      } catch (e: any) {
        setDirectError(e?.message || 'Direct fetch error');
        setDirectSeenUuid(null);
      }
      // fetch REST usando el JWT del usuario autenticado
      try {
        const sb = getSupabase(tenantUuid);
        const { data: sess } = await sb.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) throw new Error('No session token');
        const url = `${SUPABASE_URL}/rest/v1/clients?select=id,name,phone,notes&order=created_at.asc`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            'x-tenant-uuid': tenantUuid,
            'X-Client-Info': `ruteo;tenant_uuid=${tenantUuid}`,
          } as any,
        });
        const json = await res.json();
        setUserJwtClients(Array.isArray(json) ? json : []);
        setUserJwtClientsErr(null);
      } catch (e: any) {
        setUserJwtClientsErr(e?.message || 'User JWT clients fetch error');
        setUserJwtClients(null);
      }
    })();
  }, [tenantUuid]);

  return (
    import.meta.env.DEV ? (
    <div className="mt-6 text-xs text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3">
      <div><strong>Tenant UUID (cliente):</strong> {tenantLoading ? 'Resolviendo…' : (tenantUuid || 'null')}</div>
      <div><strong>Tenant visto por servidor (consulta RLS):</strong> {serverSeenUuid ?? 'null'} {rpcError ? ` | error: ${rpcError}` : ''}</div>
      <div><strong>Tenant visto por PostgREST (REST GET):</strong> {directSeenUuid ?? 'null'} {directError ? ` | error: ${directError}` : ''}</div>
      <div className="mt-2">
        <strong>Clientes crudos (DB):</strong>{' '}
        {clientsError ? `error: ${clientsError}` : (rawClients ? `${rawClients.length} filas` : 'cargando…')}
        {rawClients && rawClients.length > 0 && (
          <ul className="list-disc ml-5 mt-1">
            {rawClients.slice(0, 10).map((c: any) => (
              <li key={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2">
        <strong>Clientes (REST con JWT usuario):</strong>{' '}
        {userJwtClientsErr ? `error: ${userJwtClientsErr}` : (userJwtClients ? `${userJwtClients.length} filas` : 'cargando…')}
        {userJwtClients && userJwtClients.length > 0 && (
          <ul className="list-disc ml-5 mt-1">
            {userJwtClients.slice(0, 10).map((c: any) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="opacity-70">Este panel es temporal para depurar el header X-Tenant-UUID.</div>
    </div>) : null
  );
}

export default Clients;
