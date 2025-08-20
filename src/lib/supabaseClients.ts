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
    
    // 1. Check if slug is available
    const { data: existingTenant } = await sb
      .from('tenants')
      .select('slug')
      .eq('slug', data.companySlug)
      .single();
    
    if (existingTenant) {
      return { success: false, error: 'El identificador ya está en uso' };
    }

    // 2. Create user account first
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: data.ownerEmail,
      password: data.ownerPassword,
      options: {
        data: {
          name: data.ownerName,
        }
      }
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Error al crear usuario' };
    }

    // 3. Create tenant
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
      return { success: false, error: tenantError?.message || 'Error al crear empresa' };
    }

    // 4. Create tenant membership (Owner role)
    const { error: membershipError } = await sb
      .from('tenant_memberships')
      .insert({
        user_id: authData.user.id,
        tenant_uuid: tenant.uuid_id,
        role: 'Owner',
      });

    if (membershipError) {
      return { success: false, error: membershipError.message || 'Error al asignar rol' };
    }

    return { 
      success: true, 
      tenant: tenant,
      user: authData.user 
    };
  } catch (e: any) {
    console.error('createTenantAndOwner error:', e);
    return { success: false, error: e.message || 'Error inesperado' };
  }
}
