import { getSupabase } from './supabase';
import type { Client, ClientAddress } from './clients';

function toClient(row: any): Client {
  const addresses: ClientAddress[] = (row.client_addresses || []).map((a: any) => ({
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
  // Usamos RPC para fijar tenant en la sesión del request (sin depender de headers)
  const { data, error } = await sb.rpc('list_clients', { p_tenant: tenantUuid });
  if (error) throw error;
  const rows = (data as any[]) || [];
  // Cargamos direcciones por cliente vía RPC también
  const result: Client[] = [];
  for (const row of rows) {
    const addresses = await listAddressesSB(row.id, tenantUuid);
    result.push({ id: row.id, name: row.name, phone: row.phone ?? undefined, notes: row.notes ?? undefined, addresses });
  }
  return result;
}

export async function createClientSB(input: { name: string; phone?: string; notes?: string }, tenantUuid: string): Promise<Client> {
  const sb = getSupabase(tenantUuid);
  const { data, error } = await sb.rpc('create_client', {
    p_tenant: tenantUuid,
    p_name: input.name,
    p_phone: input.phone ?? null,
    p_notes: input.notes ?? null,
  });
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
  const { data, error } = await sb.rpc('list_client_addresses', { p_tenant: tenantUuid, p_client_id: clientId });
  if (error) throw error;
  return ((data as any[]) || []).map((a: any) => ({ id: a.id, label: a.label ?? undefined, address: a.address, lat: a.lat ?? undefined, lng: a.lng ?? undefined }));
}

export async function upsertAddressSB(clientId: string, addr: { id?: string; label?: string; address: string; lat?: number; lng?: number }, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  if (!addr.id) {
    const { error } = await sb.rpc('insert_client_address', {
      p_tenant: tenantUuid,
      p_client_id: clientId,
      p_label: addr.label ?? null,
      p_address: addr.address,
      p_lat: addr.lat ?? null,
      p_lng: addr.lng ?? null,
    });
    if (error) throw error;
  } else {
    const { error } = await sb.rpc('update_client_address', {
      p_tenant: tenantUuid,
      p_id: addr.id,
      p_client_id: clientId,
      p_label: addr.label ?? null,
      p_address: addr.address,
      p_lat: addr.lat ?? null,
      p_lng: addr.lng ?? null,
    });
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
  // Try secure RPC first (recommended). If not present, fallback to direct select.
  try {
    const { data, error } = await sb.rpc('list_team_members', { p_tenant: tenantUuid });
    if (error) throw error;
    const rows = (data as any[]) || [];
    return rows.map((r) => ({
      user_id: r.user_id,
      email: r.email ?? '',
      name: r.name ?? undefined,
      role: (r.role as TeamRole) ?? 'Driver',
      created_at: r.created_at,
      status: (r.status as TeamStatus) ?? 'active',
    }));
  } catch (_e) {
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
