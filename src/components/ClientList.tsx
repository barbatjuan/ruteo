import React, { useEffect, useState } from 'react';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { Client } from '../lib/clients';
import { deleteClientSB, listClientsSB, updateClientSB } from '../lib/supabaseClients';
import ClientForm from './ClientForm';
import EmptyState from './EmptyState';
import ClientAddresses from './ClientAddresses';

const ClientList: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!tenantUuid) { setClients([]); return; }
      try {
        setLoading(true);
        const rows = await listClientsSB(tenantUuid);
        setClients(rows);
      } catch (e) {
        console.error(e);
        error('No se pudieron cargar los clientes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantUuid, refresh]);

  const remove = async (id: string) => {
    if (!tenantUuid) return;
    try {
      await deleteClientSB(id, tenantUuid);
      setRefresh((x) => x + 1);
      success('Cliente eliminado');
    } catch (e) {
      console.error(e);
      error('No se pudo eliminar el cliente');
    }
  };

  const [openRow, setOpenRow] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; phone?: string; notes?: string }>({ name: '' });

  const startEdit = (c: Client) => {
    setOpenRow(openRow === c.id ? null : c.id);
    setForm({ id: c.id, name: c.name, phone: c.phone, notes: c.notes });
  };

  const saveEdit = async () => {
    if (!tenantUuid || !form.id || !form.name.trim()) return;
    try {
      await updateClientSB({ id: form.id, name: form.name.trim(), phone: form.phone?.trim() || undefined, notes: form.notes?.trim() || undefined }, tenantUuid);
      setRefresh(x=>x+1);
      success('Cliente actualizado');
    } catch (e) {
      console.error(e);
      error('No se pudo actualizar el cliente');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-300 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Clientes</h2>
        <button onClick={() => setOpen(!open)} className="rounded-md bg-sky-600 text-white px-3 py-1 hover:bg-sky-700">
          {open ? 'Cerrar' : 'Nuevo'}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-md border border-slate-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 relative z-10 pointer-events-auto">
          <ClientForm onCreated={() => { setRefresh((x)=>x+1); setOpen(false); }} />
        </div>
      )}

      {loading ? (
        <div className="mt-4 text-sm text-slate-800 dark:text-slate-300">Cargando…</div>
      ) : !clients.length ? (
        <div className="mt-4">
          <EmptyState
            title="Sin clientes aún"
            description="Crea tu primer cliente para guardar direcciones frecuentes y acelerar tus rutas."
            action={<button onClick={() => setOpen(true)} className="rounded-md bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">Crear cliente</button>}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-slate-400 dark:border-slate-600">
            <thead>
              <tr className="bg-slate-900 text-white dark:bg-slate-800">
                <th className="px-3 py-2 text-left text-sm font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Teléfono</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Notas</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Direcciones</th>
                <th className="px-3 py-2 text-right text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950">
              {clients.map((c) => (
                <React.Fragment key={c.id}>
                  <tr className="border-t border-slate-300 dark:border-slate-700">
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{c.phone || '-'}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{c.notes || '-'}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{c.addresses.length}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => startEdit(c)} className="text-sky-700 hover:underline text-sm mr-3">{openRow === c.id ? 'Cerrar' : 'Detalles'}</button>
                      <button onClick={() => remove(c.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                    </td>
                  </tr>
                  {openRow === c.id && (
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={5} className="px-3 py-3 border-t border-slate-300 dark:border-slate-700">
                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <label className="text-xs font-medium">Nombre</label>
                            <input className="mt-1 w-full rounded-md border border-slate-400 dark:border-slate-600 bg-transparent px-3 py-2" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Teléfono</label>
                            <input className="mt-1 w-full rounded-md border border-slate-400 dark:border-slate-600 bg-transparent px-3 py-2" value={form.phone || ''} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Notas</label>
                            <input className="mt-1 w-full rounded-md border border-slate-400 dark:border-slate-600 bg-transparent px-3 py-2" value={form.notes || ''} onChange={(e)=>setForm({ ...form, notes: e.target.value })} />
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button onClick={saveEdit} className="rounded-md bg-sky-600 text-white px-3 py-1 text-sm hover:bg-sky-700">Guardar cambios</button>
                        </div>

                        <div className="mt-3">
                          <ClientAddresses clientId={c.id} onChange={() => setRefresh(x=>x+1)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientList;
