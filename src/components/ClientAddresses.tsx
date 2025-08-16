import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClientAddress, listClients, removeAddress, upsertAddress } from '../lib/clients';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { autocompletePlaces, geocodeByPlaceId } from '../lib/api';

const ClientAddresses: React.FC<{ clientId: string; onChange?: () => void }> = ({ clientId, onChange }) => {
  const { resolveTenantFromLocation } = useTenant();
  const tenant = resolveTenantFromLocation() ?? undefined;
  const { success, error } = useToast();
  const [refresh, setRefresh] = useState(0);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const debRef = useRef<number | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    window.clearTimeout(debRef.current);
    if (!address || address.trim().length < 3) {
      setSuggestions([]); setOpenSug(false); return;
    }
    debRef.current = window.setTimeout(async () => {
      const res = await autocompletePlaces(address.trim());
      setSuggestions(res);
      setOpenSug(res.length > 0);
    }, 250);
  }, [address]);

  const client = useMemo(() => listClients(tenant).find(c => c.id === clientId)!, [tenant, clientId, refresh]);
  const addresses = client?.addresses ?? [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) { error('La dirección es obligatoria'); return; }
    try {
      setSaving(true);
      upsertAddress(clientId, { label: label.trim() || undefined, address: address.trim() }, tenant);
      setLabel(''); setAddress('');
      setRefresh(x=>x+1);
      onChange?.();
      success('Dirección guardada');
    } catch (err) {
      console.error(err);
      error('No se pudo guardar la dirección');
    } finally {
      setSaving(false);
    }
  };

  const del = (id: string) => {
    removeAddress(clientId, id, tenant);
    setRefresh(x=>x+1);
    onChange?.();
    success('Dirección eliminada');
  };

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium mb-2">Direcciones frecuentes</h4>
      {addresses.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">Sin direcciones.</div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {addresses.map((a: ClientAddress) => (
            <li key={a.id} className="py-2 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{a.label || 'Sin etiqueta'}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{a.address}</div>
              </div>
              <button onClick={() => del(a.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={save} className="mt-3 grid gap-2 md:grid-cols-3">
        <input placeholder="Etiqueta (opcional)" className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={label} onChange={(e)=>setLabel(e.target.value)} />
        <div className="relative md:col-span-2" ref={boxRef}>
          <input placeholder="Dirección" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={address} onChange={(e)=>setAddress(e.target.value)} />
          {openSug && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-72 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s.place_id}
                  onClick={async () => {
                    try {
                      const det = await geocodeByPlaceId(s.place_id);
                      setAddress(det.normalized || s.description);
                    } catch {
                      setAddress(s.description);
                    } finally {
                      setSuggestions([]); setOpenSug(false);
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="text-sm">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-60">{saving ? 'Guardando…' : 'Agregar'}</button>
        </div>
      </form>
    </div>
  );
};

export default ClientAddresses;
