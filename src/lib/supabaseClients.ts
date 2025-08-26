import { getSupabase } from './supabase';
import type { Client, ClientAddress } from './clients';

function toClient(row: any): Client {
  const embedded = row.client_addresses ?? row.addresses ?? [];
  const addresses: ClientAddress[] = (embedded || []).map((a: any) => ({
    id: a.id,
    label: a.label ?? undefined,
    address: a.address,
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
  }));
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    addresses,
  };
}

export async function listClientsSB(tenantUuid: string): Promise<Client[]> {
  const sb = getSupabase(tenantUuid);
  
  // Método 1: Cargar clientes primero y luego sus direcciones por separado
  // Esto evita problemas de RLS con las direcciones embebidas
  try {
    // Primero cargamos los clientes básicos
    const { data: clientsData, error: clientsError } = await sb
      .from('clients')
      .select('id, name, phone, notes')
      .eq('tenant_uuid', tenantUuid)
      .order('created_at', { ascending: true });
    
    if (clientsError) throw clientsError;
    
    // Luego cargamos las direcciones para cada cliente
    console.log('[listClientsSB] Cargando direcciones para', clientsData?.length || 0, 'clientes');
    const clientsWithAddresses: Client[] = [];
    
    for (const client of (clientsData || [])) {
      try {
        const addresses = await listAddressesSB(client.id, tenantUuid);
        clientsWithAddresses.push({
          id: client.id,
          name: client.name,
          phone: client.phone ?? undefined,
          notes: client.notes ?? undefined,
          addresses: addresses
        });
      } catch (addrErr) {
        console.warn('[listClientsSB] Error al cargar direcciones para cliente', client.id, addrErr);
        // Agregamos el cliente sin direcciones
        clientsWithAddresses.push({
          id: client.id,
          name: client.name,
          phone: client.phone ?? undefined,
          notes: client.notes ?? undefined,
          addresses: []
        });
      }
    }
    
    return clientsWithAddresses;
  } catch (e) {
    console.error('[listClientsSB] Error al cargar clientes:', e);
    throw e;
  }
}

export async function createClientSB(input: { name: string; phone?: string; notes?: string }, tenantUuid: string): Promise<Client> {
  const sb = getSupabase(tenantUuid);
  const { data, error } = await sb
    .from('clients')
    .insert({
      tenant_uuid: tenantUuid,
      name: input.name,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .select('id, name, phone, notes')
    .single();
  if (error) throw error;
  const row = data as any;
  return { id: row.id, name: row.name, phone: row.phone ?? undefined, notes: row.notes ?? undefined, addresses: [] };
}

export async function updateClientSB(update: { id: string; name?: string; phone?: string; notes?: string }, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const payload: any = {};
  if (update.name !== undefined) payload.name = update.name;
  if (update.phone !== undefined) payload.phone = update.phone ?? null;
  if (update.notes !== undefined) payload.notes = update.notes ?? null;
  const { error } = await sb.from('clients').update(payload).eq('id', update.id);
  if (error) throw error;
}

export async function deleteClientSB(id: string, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function listAddressesSB(clientId: string, tenantUuid: string): Promise<ClientAddress[]> {
  const sb = getSupabase(tenantUuid);
  
  // Intento 1: Consulta directa a la tabla sin filtros RLS adicionales
  try {
    // Usamos el método más simple primero
    const { data, error } = await sb
      .from('client_addresses')
      .select('id, label, address, lat, lng')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    
    if (!error && Array.isArray(data) && data.length > 0) {
      console.log('[listAddressesSB] DIRECT client_id=', clientId, 'tenant=', tenantUuid, 'rows=', data.length);
      return data.map((a: any) => ({
        id: a.id,
        label: a.label ?? undefined,
        address: a.address,
        lat: a.lat ?? undefined,
        lng: a.lng ?? undefined
      }));
    }
  } catch (directErr) {
    console.warn('[listAddressesSB] Direct query failed:', directErr);
  }
  
  // Intento 2: Usar una consulta SQL directa para evitar problemas de RLS
  try {
    // Consulta directa sin JOIN para ver si hay algo
    const { data: checkData, error: checkError } = await sb.rpc('list_client_addresses', {
      p_client_id: clientId,
      p_tenant: tenantUuid  // Corregido: p_tenant en lugar de p_tenant_uuid
    });
    
    if (!checkError && Array.isArray(checkData) && checkData.length > 0) {
      console.log('[listAddressesSB] RPC client_id=', clientId, 'rows=', checkData.length);
      return checkData.map((a: any) => ({
        id: a.id,
        label: a.label ?? undefined,
        address: a.address,
        lat: a.lat ?? undefined,
        lng: a.lng ?? undefined
      }));
    }
  } catch (rpcErr) {
    // RPC puede no existir aún, es normal que falle
    console.warn('[listAddressesSB] RPC failed (puede ser normal):', rpcErr);
  }
  
  // Intento 3: JOIN explícito con clients para garantizar tenant_uuid correcto
  try {
    const { data, error } = await sb.from('client_addresses')
      .select('id, label, address, lat, lng, clients!inner(tenant_uuid)')
      .eq('client_id', clientId)
      .eq('clients.tenant_uuid', tenantUuid)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      console.log('[listAddressesSB] JOIN client_id=', clientId, 'tenant=', tenantUuid, 'rows=', data.length);
      return data.map((a: any) => ({
        id: a.id,
        label: a.label ?? undefined,
        address: a.address,
        lat: a.lat ?? undefined,
        lng: a.lng ?? undefined
      }));
    }
  } catch (joinErr) {
    console.warn('[listAddressesSB] JOIN failed:', joinErr);
  }

  // Si llegamos aquí, no pudimos obtener direcciones
  console.log('[listAddressesSB] No se encontraron direcciones para client_id=', clientId);
  return [];
}

export async function upsertAddressSB(clientId: string, addr: { id?: string; label?: string; address: string; lat?: number; lng?: number }, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  if (!addr.id) {
    const { error } = await sb
      .from('client_addresses')
      .insert({
        tenant_uuid: tenantUuid,
        client_id: clientId,
        label: addr.label ?? null,
        address: addr.address,
        lat: addr.lat ?? null,
        lng: addr.lng ?? null,
      });
    if (error) throw error;
  } else {
    const { error } = await sb
      .from('client_addresses')
      .update({
        label: addr.label ?? null,
        address: addr.address,
        lat: addr.lat ?? null,
        lng: addr.lng ?? null,
      })
      .eq('id', addr.id)
      .eq('client_id', clientId);
    if (error) throw error;
  }
}

export async function removeAddressSB(clientId: string, addressId: string, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const { error } = await sb.from('client_addresses').delete().eq('id', addressId).eq('client_id', clientId);
  if (error) throw error;
}

// Create tenant and owner user
export async function createTenantAndOwner(data: {
  companyName: string;
  companySlug: string;
  plan: 'Free' | 'Pro' | 'Business';
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}) {
  try {
    const sb = getSupabase();

    // 1. Create user account first (handle duplicates and rate limiting)
    let authUser = null as null | { id: string };
    {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: data.ownerEmail,
        password: data.ownerPassword,
        options: {
          data: {
            name: data.ownerName,
          }
        }
      });
      if (authError) {
        const msg = (authError as any)?.message || '';
        const status = (authError as any)?.status || (authError as any)?.statusCode;
        // Too many requests
        if (status === 429) {
          return { success: false, error: 'Demasiadas solicitudes al registrar. Intenta nuevamente en 1 minuto.' };
        }
        // If already registered, try login with provided password
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
          const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({ email: data.ownerEmail, password: data.ownerPassword });
          if (signInErr || !signInData.user) {
            return { success: false, error: 'El email ya existe y no fue posible iniciar sesión con la contraseña proporcionada.' };
          }
          authUser = { id: signInData.user.id };
        } else {
          return { success: false, error: msg || 'Error al crear usuario' };
        }
      } else if (authData.user) {
        authUser = { id: authData.user.id };
      }
    }

    // 2. Create tenant (avoid pre-check; rely on unique constraint and catch 23505)
    const { data: tenant, error: tenantError } = await sb
      .from('tenants')
      .insert({
        slug: data.companySlug,
        name: data.companyName,
        plan: data.plan,
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      // Unique violation -> slug en uso
      if ((tenantError as any)?.code === '23505') {
        return { success: false, error: 'El identificador ya está en uso' };
      }
      return { success: false, error: tenantError?.message || 'Error al crear empresa' };
    }

    // 3. Create tenant membership (Owner role)
    if (!authUser) {
      return { success: false, error: 'No se pudo determinar el usuario autenticado' };
    }
    const { error: membershipError } = await sb
      .from('tenant_memberships')
      .insert({
        user_id: authUser.id,
        tenant_uuid: tenant.uuid_id,
        role: 'Owner',
      });

    if (membershipError) {
      return { success: false, error: membershipError.message || 'Error al asignar rol' };
    }

    return {
      success: true,
      tenant: tenant,
      user: { id: authUser.id } as any,
    };
  } catch (e: any) {
    console.error('createTenantAndOwner error:', e);
    return { success: false, error: e.message || 'Error inesperado' };
  }
}

// ==============================
// Team management (tenant_memberships)
// ==============================

type TeamRole = 'Owner' | 'Admin' | 'Dispatcher' | 'Driver';
type TeamStatus = 'active' | 'invited' | 'inactive';

// List team members for a tenant. Note: auth.users email/name is not directly readable from client without a secure RPC.
// We return placeholders for email/name until a secure function/view is added.
export async function listTeamMembers(tenantUuid: string): Promise<{
  user_id: string;
  email: string;
  name?: string;
  role: TeamRole;
  created_at: string;
  status: TeamStatus;
}[]> {
  const sb = getSupabase(tenantUuid);
  // Direct select from tenant_memberships to avoid RPC dependency
  const { data, error } = await sb
    .from('tenant_memberships')
    .select('user_id, role, created_at')
    .eq('tenant_uuid', tenantUuid)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data as any[]) || [];
  return rows.map((r) => ({
    user_id: r.user_id,
    email: '',
    name: undefined,
    role: r.role as TeamRole,
    created_at: r.created_at,
    status: 'active' as TeamStatus,
  }));
}

// Invite a new member. From the public client we cannot create Auth users without affecting current session.
// Implement a serverless function or use service role on backend. For now, we surface a clear error.
export async function inviteTeamMember(params: {
  tenantUuid: string;
  email: string;
  name?: string;
  role: TeamRole;
}): Promise<void> {
  const sb = getSupabase(params.tenantUuid);
  const { data, error } = await sb.functions.invoke('invite-team-member', {
    body: {
      tenantUuid: params.tenantUuid,
      email: params.email,
      name: params.name,
      role: params.role,
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
}

export async function updateMemberRole(tenantUuid: string, userId: string, newRole: TeamRole): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const { error } = await sb
    .from('tenant_memberships')
    .update({ role: newRole })
    .eq('tenant_uuid', tenantUuid)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removeMemberFromTeam(tenantUuid: string, userId: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const { error } = await sb
    .from('tenant_memberships')
    .delete()
    .eq('tenant_uuid', tenantUuid)
    .eq('user_id', userId);
  if (error) throw error;
}
