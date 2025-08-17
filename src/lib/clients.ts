import { storage } from './storage';

export type ClientAddress = { id: string; label?: string; address: string; lat?: number; lng?: number };
export type Client = { id: string; name: string; phone?: string; notes?: string; addresses: ClientAddress[] };

const KEY = 'clients';

function uid() { return Math.random().toString(36).slice(2); }

export function listClients(tenant?: string): Client[] {
  return storage.local.get(KEY, tenant) ?? [];
}

export function saveClients(clients: Client[], tenant?: string) {
  storage.local.set(KEY, clients, tenant);
}

export function createClient(input: Omit<Client, 'id'>, tenant?: string): Client {
  const clients = listClients(tenant);
  const c: Client = { id: uid(), ...input };
  clients.push(c);
  saveClients(clients, tenant);
  return c;
}

export function deleteClient(id: string, tenant?: string) {
  const clients = listClients(tenant).filter(c => c.id !== id);
  saveClients(clients, tenant);
}

export function updateClient(update: Pick<Client, 'id'> & Partial<Omit<Client, 'id'>>, tenant?: string) {
  const clients = listClients(tenant);
  const idx = clients.findIndex(c => c.id === update.id);
  if (idx === -1) return;
  clients[idx] = { ...clients[idx], ...update } as Client;
  saveClients(clients, tenant);
}

export function upsertAddress(clientId: string, addr: Omit<ClientAddress, 'id'> & { id?: string }, tenant?: string) {
  const clients = listClients(tenant);
  const c = clients.find(x => x.id === clientId);
  if (!c) return;
  if (!addr.id) {
    c.addresses.push({ id: uid(), label: addr.label, address: addr.address });
  } else {
    const i = c.addresses.findIndex(a => a.id === addr.id);
    if (i >= 0) c.addresses[i] = { id: addr.id, label: addr.label, address: addr.address };
  }
  saveClients(clients, tenant);
}

export function removeAddress(clientId: string, addressId: string, tenant?: string) {
  const clients = listClients(tenant);
  const c = clients.find(x => x.id === clientId);
  if (!c) return;
  c.addresses = c.addresses.filter(a => a.id !== addressId);
  saveClients(clients, tenant);
}
