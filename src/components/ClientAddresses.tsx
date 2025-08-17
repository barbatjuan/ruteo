import React, { useEffect, useRef, useState } from 'react';
import { ClientAddress } from '../lib/clients';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { autocompletePlaces, geocodeByPlaceId, geocodeAddresses } from '../lib/api';
import { listAddressesSB, removeAddressSB, upsertAddressSB } from '../lib/supabaseClients';
import { useRoute } from '../state/RouteContext';

const ClientAddresses: React.FC<{ clientId: string; onChange?: () => void }> = ({ clientId, onChange }) => {
  const { tenantUuid } = useTenant();
  const { success, error } = useToast();
  const { addStop } = useRoute();
  const [refresh, setRefresh] = useState(0);
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
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
    // If user edits the address manually, clear lat/lng so we'll re-geocode on save
  }, [address]);

  useEffect(() => {
    // Clear lat/lng whenever the address text changes directly (not via suggestion click)
    setLat(undefined);
    setLng(undefined);
  }, [address]);

  useEffect(() => {
    const load = async () => {
      if (!tenantUuid) { setAddresses([]); return; }
      try {
        setLoading(true);
        const rows = await listAddressesSB(clientId, tenantUuid);
        setAddresses(rows);
      } catch (e) {
        console.error(e);
        error('No se pudieron cargar las direcciones');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantUuid, clientId, refresh]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) { error('La dirección es obligatoria'); return; }
    try {
      setSaving(true);
      if (!tenantUuid) { throw new Error('Tenant no definido'); }
      let curLat = lat; let curLng = lng;
      if (curLat === undefined || curLng === undefined) {
        try {
          const res = await geocodeAddresses([{ address: address.trim() }], tenantUuid);
          if (res && res[0]) { curLat = res[0].lat; curLng = res[0].lng; }
        } catch {
          // keep undefined if geocode fails; we still store the address
        }
      }
      await upsertAddressSB(clientId, { label: label.trim() || undefined, address: address.trim(), lat: curLat, lng: curLng }, tenantUuid);
      setLabel(''); setAddress('');
      setLat(undefined); setLng(undefined);
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

  const del = async (id: string) => {
    try {
      if (!tenantUuid) { throw new Error('Tenant no definido'); }
      await removeAddressSB(clientId, id, tenantUuid);
      setRefresh(x=>x+1);
      onChange?.();
      success('Dirección eliminada');
    } catch (e) {
      console.error(e);
      error('No se pudo eliminar la dirección');
    }
  };

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium mb-2">Direcciones frecuentes</h4>
      {loading ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">Cargando…</div>
      ) : addresses.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">Sin direcciones.</div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {addresses.map((a: ClientAddress) => (
            <li key={a.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{a.label || 'Sin etiqueta'}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{a.address}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={async () => {
                    try {
                      let lat = a.lat; let lng = a.lng;
                      if (lat === undefined || lng === undefined) {
                        const res = await geocodeAddresses([{ address: a.address }], tenantUuid || undefined);
                        if (res && res[0]) { lat = res[0].lat; lng = res[0].lng; }
                        // Persist back if resolved
                        if (lat !== undefined && lng !== undefined) {
                          await upsertAddressSB(clientId, { id: a.id, label: a.label, address: a.address, lat, lng }, tenantUuid!);
                          setRefresh((x) => x + 1);
                        }
                      }
                      if (lat === undefined || lng === undefined) {
                        error('No se pudo obtener coordenadas de la dirección');
                        return;
                      }
                      addStop({ address: a.address, lat, lng, label: a.label });
                      success('Cliente agregado a la ruta');
                    } catch (e) {
                      console.error(e);
                      error('No se pudo agregar a la ruta');
                    }
                  }}
                  className="text-emerald-700 hover:underline text-xs"
                >
                  Agregar a ruta
                </button>
                <button onClick={() => del(a.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
              </div>
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
                      setLat(det.lat); setLng(det.lng);
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
