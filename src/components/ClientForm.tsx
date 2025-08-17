import React, { useState } from 'react';
import { createClientSB, upsertAddressSB } from '../lib/supabaseClients';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';

const ClientForm: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const { tenantUuid, tenantLoading } = useTenant();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addr, setAddr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('El nombre es obligatorio');
      return;
    }
    if (!tenantUuid) {
      error('Tenant no definido');
      return;
    }
    try {
      setSaving(true);
      const client = await createClientSB({ name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined }, tenantUuid);
      // Crear dirección inicial si se ingresó
      if (addr.trim()) {
        await upsertAddressSB(client.id, { address: addr.trim() }, tenantUuid);
      }
      success('Cliente creado');
      setName(''); setPhone(''); setNotes(''); setAddr('');
      onCreated?.();
    } catch (err) {
      console.error(err);
      error('No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      {!tenantUuid && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {tenantLoading ? 'Resolviendo tenant…' : 'Tenant no definido'}
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
        <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Dirección</label>
        <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2" value={addr} onChange={(e)=>setAddr(e.target.value)} placeholder="Calle 123, Ciudad" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono</label>
          <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notas</label>
          <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2" value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !tenantUuid || tenantLoading} className="rounded-xl bg-sky-600 text-white px-4 py-2 disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;
