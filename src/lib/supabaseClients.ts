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
  const { data, error } = await sb
    .from('clients')
    .select('id, name, phone, notes, created_at, client_addresses(id, label, address, lat, lng)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toClient);
}

export async function createClientSB(input: { name: string; phone?: string; notes?: string }, tenantUuid: string): Promise<Client> {
  const sb = getSupabase(tenantUuid);
  const { data, error } = await sb
    .from('clients')
    .insert([{ name: input.name, phone: input.phone ?? null, notes: input.notes ?? null }])
    .select('id, name, phone, notes, client_addresses(id, label, address, lat, lng)')
    .single();
  if (error) throw error;
  return toClient(data);
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
  const { data, error } = await sb.from('client_addresses').select('id, label, address, lat, lng').eq('client_id', clientId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((a: any) => ({ id: a.id, label: a.label ?? undefined, address: a.address, lat: a.lat ?? undefined, lng: a.lng ?? undefined }));
}

export async function upsertAddressSB(clientId: string, addr: { id?: string; label?: string; address: string; lat?: number; lng?: number }, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  if (!addr.id) {
    const { error } = await sb.from('client_addresses').insert([{ client_id: clientId, label: addr.label ?? null, address: addr.address, lat: addr.lat ?? null, lng: addr.lng ?? null }]);
    if (error) throw error;
  } else {
    const { error } = await sb.from('client_addresses').update({ label: addr.label ?? null, address: addr.address, lat: addr.lat ?? null, lng: addr.lng ?? null }).eq('id', addr.id).eq('client_id', clientId);
    if (error) throw error;
  }
}

export async function removeAddressSB(clientId: string, addressId: string, tenantUuid: string): Promise<void> {
  const sb = getSupabase(tenantUuid);
  const { error } = await sb.from('client_addresses').delete().eq('id', addressId).eq('client_id', clientId);
  if (error) throw error;
}
