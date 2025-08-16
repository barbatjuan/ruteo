import React, { useMemo, useState } from 'react';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { Client, deleteClient, listClients, updateClient } from '../lib/clients';
import ClientForm from './ClientForm';
import EmptyState from './EmptyState';
import ClientAddresses from './ClientAddresses';

const ClientList: React.FC = () => {
  const { resolveTenantFromLocation } = useTenant();
  const tenant = resolveTenantFromLocation() ?? undefined;
  const { success } = useToast();
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const clients = useMemo<Client[]>(() => listClients(tenant), [tenant, refresh]);

  const remove = (id: string) => {
    deleteClient(id, tenant);
    setRefresh((x) => x + 1);
    success('Cliente eliminado');
  };

  const [openRow, setOpenRow] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; phone?: string; notes?: string }>({ name: '' });

  const startEdit = (c: Client) => {
    setOpenRow(openRow === c.id ? null : c.id);
    setForm({ id: c.id, name: c.name, phone: c.phone, notes: c.notes });
  };

  const saveEdit = () => {
    if (!form.id || !form.name.trim()) return;
    updateClient({ id: form.id, name: form.name.trim(), phone: form.phone?.trim() || undefined, notes: form.notes?.trim() || undefined }, tenant);
    setRefresh(x=>x+1);
    success('Cliente actualizado');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Clientes</h2>
        <button onClick={() => setOpen(!open)} className="rounded-xl bg-sky-600 text-white px-3 py-1">
          {open ? 'Cerrar' : 'Nuevo'}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
          <ClientForm onCreated={() => { setRefresh((x)=>x+1); setOpen(false); }} />
        </div>
      )}

      {!clients.length ? (
        <div className="mt-4">
          <EmptyState
            title="Sin clientes aún"
            description="Crea tu primer cliente para guardar direcciones frecuentes y acelerar tus rutas."
            action={<button onClick={() => setOpen(true)} className="rounded-xl bg-sky-600 text-white px-4 py-2">Crear cliente</button>}
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {clients.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {c.phone ? `${c.phone} • ` : ''}{c.addresses.length} direcciones
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(c)} className="text-sky-700 hover:underline text-sm">{openRow === c.id ? 'Cerrar' : 'Detalles'}</button>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                </div>
              </div>

              {openRow === c.id && (
                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium">Nombre</label>
                      <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Teléfono</label>
                      <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={form.phone || ''} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Notas</label>
                      <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={form.notes || ''} onChange={(e)=>setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button onClick={saveEdit} className="rounded-xl bg-sky-600 text-white px-3 py-1 text-sm">Guardar cambios</button>
                  </div>

                  <ClientAddresses clientId={c.id} onChange={() => setRefresh(x=>x+1)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientList;
