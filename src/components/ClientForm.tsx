import React, { useState } from 'react';
import { createClient } from '../lib/clients';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';

const ClientForm: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const { resolveTenantFromLocation } = useTenant();
  const tenant = resolveTenantFromLocation() ?? undefined;
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('El nombre es obligatorio');
      return;
    }
    try {
      setSaving(true);
      createClient({ name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined, addresses: [] }, tenant);
      success('Cliente creado');
      setName(''); setPhone(''); setNotes('');
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
      <div>
        <label className="text-sm font-medium">Nombre</label>
        <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Teléfono</label>
          <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Notas</label>
          <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 text-white px-4 py-2 disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;
