import React, { useEffect, useRef, useState } from 'react';
import { createClientSB, upsertAddressSB } from '../lib/supabaseClients';
import { autocompletePlaces, geocodeByPlaceId, geocodeAddresses } from '../lib/api';
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
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const debRef = useRef<number | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    window.clearTimeout(debRef.current);
    if (!addr || addr.trim().length < 3) {
      setSuggestions([]); setOpenSug(false); return;
    }
    debRef.current = window.setTimeout(async () => {
      const res = await autocompletePlaces(addr.trim());
      setSuggestions(res);
      setOpenSug(res.length > 0);
    }, 250);
  }, [addr]);

  useEffect(() => {
    setAddrLat(undefined);
    setAddrLng(undefined);
  }, [addr]);

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
        let curLat = addrLat; let curLng = addrLng;
        if (curLat === undefined || curLng === undefined) {
          try {
            const res = await geocodeAddresses([{ address: addr.trim() }], tenantUuid);
            if (res && res[0]) { curLat = res[0].lat; curLng = res[0].lng; }
          } catch {
            // keep undefined if geocode fails; we still store the address
          }
        }
        await upsertAddressSB(client.id, { address: addr.trim(), lat: curLat, lng: curLng }, tenantUuid);
      }
      success('Cliente creado');
      setName(''); setPhone(''); setNotes(''); setAddr(''); setAddrLat(undefined); setAddrLng(undefined);
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
      <div ref={boxRef} className="relative">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Dirección</label>
        <input
          ref={inputRef}
          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
          value={addr}
          onChange={(e)=>setAddr(e.target.value)}
          placeholder="Calle 123, Ciudad"
        />
        {openSug && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-72 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow">
            {suggestions.map((s) => (
              <button
                type="button"
                key={s.place_id}
                onClick={async () => {
                  try {
                    const det = await geocodeByPlaceId(s.place_id);
                    setAddr(det.normalized || s.description);
                    setAddrLat(det.lat); setAddrLng(det.lng);
                    setSuggestions([]); setOpenSug(false);
                    try { inputRef.current?.blur(); } catch {}
                  } catch (e) {
                    // ignore
                  }
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <span className="text-sm">{s.description}</span>
              </button>
            ))}
          </div>
        )}
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
