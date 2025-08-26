import React, { useEffect, useRef, useState } from 'react';
import { parseSimpleCSV, SimpleRow } from '../lib/csv';
import { useToast } from '../state/ToastContext';
import Loader from './Loader';
import { useRoute } from '../state/RouteContext';
import { geocodeAddresses, calculateOptimizedRoute, autocompletePlaces, geocodeByPlaceId } from '../lib/api';
import Input from './ui/Input';
import Button from './ui/Button';
import { useTenant } from '../state/TenantContext';
import { getTenantCompanyDetails } from '../lib/tenant';

const AddressForm: React.FC = () => {
  const [input, setInput] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();
  const { addStop, stops, setStops, setRouteInfo, origin, setOrigin, roundTrip, setRoundTrip } = useRoute();
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const debRef = useRef<number | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Origin autocomplete state
  const [originInput, setOriginInput] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [openOriginSug, setOpenOriginSug] = useState(false);
  const originDebRef = useRef<number | undefined>(undefined);
  const originBoxRef = useRef<HTMLDivElement | null>(null);
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const { tenantUuid } = useTenant();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
      if (originBoxRef.current && !originBoxRef.current.contains(e.target as Node)) setOpenOriginSug(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    window.clearTimeout(debRef.current);
    if (!input || input.trim().length < 3) {
      setSuggestions([]); setOpenSug(false); return;
    }
    debRef.current = window.setTimeout(async () => {
      const res = await autocompletePlaces(input.trim());
      setSuggestions(res);
      setOpenSug(res.length > 0);
    }, 250);
  }, [input]);

  useEffect(() => {
    window.clearTimeout(originDebRef.current);
    if (!originInput || originInput.trim().length < 3) {
      setOriginSuggestions([]); setOpenOriginSug(false); return;
    }
    originDebRef.current = window.setTimeout(async () => {
      const res = await autocompletePlaces(originInput.trim());
      setOriginSuggestions(res);
      setOpenOriginSug(res.length > 0);
    }, 250);
  }, [originInput]);

  // Default origin to company's saved location if available and no origin set
  useEffect(() => {
    const run = async () => {
      if (!tenantUuid) return;
      if (origin) return; // already set by user
      try {
        const det = await getTenantCompanyDetails(tenantUuid);
        if (det && det.company_lat != null && det.company_lng != null && (det.company_formatted_address || det.company_address)) {
          setOrigin({
            address: det.company_formatted_address || det.company_address || 'Base empresa',
            lat: det.company_lat as number,
            lng: det.company_lng as number,
          });
        }
      } catch (e) {
        // silent
      }
    };
    run();
    // only on mount/tenant change; do not depend on origin to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantUuid]);

  const add = async () => {
    if (!input || input.trim().length < 3) {
      setErrors('La dirección debe tener al menos 3 caracteres');
      error('Dirección inválida');
      return;
    }
    setErrors(null);
    try {
      setLoading(true);
      const res = await geocodeAddresses([{ address: input }]);
      if (!res || !res.length) throw new Error('No se pudo geocodificar');
      const g = res[0];
      addStop({ address: g.normalized || input, lat: g.lat, lng: g.lng });
      setInput('');
      setSuggestions([]);
      setOpenSug(false);
      try { inputRef.current?.blur(); } catch {}
      success('Dirección agregada');
    } catch (e) {
      console.error(e);
      error('Error al geocodificar la dirección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 w-full max-w-full overflow-hidden">
      <div className="space-y-2 mb-4">
        <h3 className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Configuración</h3>
        <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Origen</h2>
      </div>
      <div className="mt-3 flex flex-col gap-2 items-stretch min-w-0">
        <div className="relative min-w-0" ref={originBoxRef}>
          <Input
            aria-label="Origen"
            value={originInput}
            ref={originInputRef}
            onChange={(e) => setOriginInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && originInput.trim().length >= 3) {
                try {
                  setLoading(true);
                  const [g] = await geocodeAddresses([{ address: originInput }]);
                  if (g) {
                    setOrigin({ address: g.normalized || originInput, lat: g.lat, lng: g.lng });
                    setOriginInput('');
                    setOriginSuggestions([]);
                    setOpenOriginSug(false);
                    try { originInputRef.current?.blur(); } catch {}
                  }
                } catch {
                  error('No se pudo geocodificar el origen');
                } finally { setLoading(false); }
              }
            }}
            placeholder="Depósito o punto de partida"
          />
          {openOriginSug && originSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-72 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow">
              {originSuggestions.map((s) => (
                <button
                  type="button"
                  key={s.place_id}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const det = await geocodeByPlaceId(s.place_id);
                      setOrigin({ address: det.normalized || s.description, lat: det.lat, lng: det.lng });
                      setOriginInput('');
                      setOriginSuggestions([]); setOpenOriginSug(false);
                      try { originInputRef.current?.blur(); } catch {}
                      success('Origen establecido');
                    } catch (e) {
                      console.error(e); error('No se pudo obtener detalles del lugar');
                    } finally {
                      setLoading(false);
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
        <div className="flex justify-end">
          <Button variant="pillYellow" onClick={() => setOrigin(null)}>Limpiar</Button>
        </div>
      </div>
      {origin && (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Origen: {origin.address}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <input id="roundTrip" type="checkbox" className="w-5 h-5" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
        <label htmlFor="roundTrip" className="text-sm text-slate-900 dark:text-slate-100">Volver al origen</label>
      </div>

      <div className="mt-6 space-y-2 mb-4">
        <h3 className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Ingresar direcciones</h3>
        <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Direcciones rápidas</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 relative min-w-0" ref={boxRef}>
        <Input
          aria-label="Nueva dirección"
          value={input}
          ref={inputRef}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Calle 123, Ciudad"
        />
        <Button variant="pillGreen" full onClick={add}>Agregar</Button>
        {openSug && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 sm:right-28 top-full mt-1 z-20 max-h-72 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow">
            {suggestions.map((s) => (
              <button
                type="button"
                key={s.place_id}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const det = await geocodeByPlaceId(s.place_id);
                    addStop({ address: det.normalized || s.description, lat: det.lat, lng: det.lng });
                    setInput('');
                    setSuggestions([]); setOpenSug(false);
                    try { inputRef.current?.blur(); } catch {}
                    success('Dirección agregada');
                  } catch (e) {
                    console.error(e); error('No se pudo obtener detalles del lugar');
                  } finally {
                    setLoading(false);
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
      {errors && <p role="alert" className="mt-2 text-sm text-red-600">{errors}</p>}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Importación</h3>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Importar CSV</div>
          </div>
        </div>
        <input
          type="file"
          accept=".csv"
          className="mt-2 block w-full text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 file:mr-3 file:rounded-lg file:border file:border-slate-300 dark:file:border-slate-700 file:px-3 file:py-2 file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setLoading(true);
              const text = await file.text();
              const rows: SimpleRow[] = await parseSimpleCSV(text);
              const addrs = rows
                .map((r: SimpleRow) => ({ address: (r.address || '').trim() }))
                .filter((r) => r.address.length > 3);
              const res: { address: string; lat: number; lng: number; normalized: string }[] = await geocodeAddresses(addrs);
              res.forEach((g: { address: string; lat: number; lng: number; normalized: string }) => addStop({ address: g.normalized || g.address, lat: g.lat, lng: g.lng }));
              success(`CSV importado: ${res.length} direcciones`);
            } catch (err) {
              console.error(err);
              error('Error al importar CSV');
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
      {loading && <Loader label="Procesando…" />}
      <Button
        variant="pillGreen"
        className="mt-6 w-full"
        onClick={async () => {
          if (stops.length < 2) {
            error('Agrega al menos 2 paradas');
            return;
          }
          try {
            setLoading(true);
            const pts = stops.map((s) => ({ lat: s.lat, lng: s.lng, address: s.address }));
            const res = await calculateOptimizedRoute(pts, { origin: origin || undefined, roundTrip });
            const used = new Set<number>();
            let counter = 1;
            const ordered = (res.stops as { lat: number; lng: number; address: string }[]).map((st: { lat: number; lng: number; address: string }, idx: number) => {
              const i = stops.findIndex((s, si: number) => !used.has(si) && Math.abs(s.lat - st.lat) < 1e-6 && Math.abs(s.lng - st.lng) < 1e-6);
              const pick = i >= 0 ? (used.add(i), stops[i]) : { ...st, id: `${idx}` } as any;
              const isOrigin = !!origin && Math.abs(st.lat - origin.lat) < 1e-6 && Math.abs(st.lng - origin.lng) < 1e-6;
              const label = isOrigin ? '0' : String(counter++);
              return { ...pick, address: st.address, lat: st.lat, lng: st.lng, label };
            });
            setStops(ordered);
            if (typeof res.distance_km === 'number' && typeof res.duration_min === 'number') {
              setRouteInfo({ distance_km: res.distance_km, duration_min: res.duration_min });
            }
            success('Ruta optimizada');
          } catch (e) {
            console.error(e);
            error('No se pudo optimizar la ruta');
          } finally {
            setLoading(false);
          }
        }}
      >
        Calcular ruta óptima
      </Button>
    </div>
  );
};

export default AddressForm;
