import React from 'react';
import TopNav from '../components/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { useEffect, useRef, useState } from 'react';
import { autocompletePlaces, geocodeByPlaceId } from '../lib/api';
import { getTenantCompanyDetails, updateTenantCompanyDetails } from '../lib/tenant';

const Settings: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [formatted, setFormatted] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [sugs, setSugs] = useState<{ description: string; place_id: string }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const debRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!tenantUuid) return;
      setLoading(true);
      try {
        const det = await getTenantCompanyDetails(tenantUuid);
        if (det) {
          setName(det.name || '');
          setAddress(det.company_formatted_address || det.company_address || '');
          setFormatted(det.company_formatted_address || '');
          setLat(det.company_lat ?? null);
          setLng(det.company_lng ?? null);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tenantUuid]);

  useEffect(() => {
    window.clearTimeout(debRef.current);
    if (!address || address.trim().length < 3) {
      setSugs([]); setOpenSug(false); return;
    }
    debRef.current = window.setTimeout(async () => {
      const res = await autocompletePlaces(address.trim());
      setSugs(res);
      setOpenSug(res.length > 0);
    }, 250);
  }, [address]);

  const onPickPlace = async (placeId: string, description: string) => {
    try {
      setLoading(true);
      const det = await geocodeByPlaceId(placeId);
      setAddress(description);
      setFormatted(det.normalized || description);
      setLat(det.lat);
      setLng(det.lng);
      setOpenSug(false);
      success('Dirección seleccionada');
    } catch (e) {
      console.error(e);
      error('No se pudo obtener detalles del lugar');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!tenantUuid) return;
    setSaving(true);
    try {
      await updateTenantCompanyDetails(tenantUuid, {
        name: name || null,
        company_address: address || null,
        company_formatted_address: formatted || address || null,
        company_lat: lat,
        company_lng: lng,
      });
      success('Detalles de la empresa guardados');
    } catch (e: any) {
      console.error(e);
      error(e?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <TopNav showOrgSwitcher />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración</h1>

        <Card>
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detalles de la empresa</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: ACME S.A." />
            </div>
            <div className="relative" ref={boxRef}>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dirección</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle 123, Ciudad" />
              {openSug && sugs.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-72 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow">
                  {sugs.map((s) => (
                    <button
                      type="button"
                      key={s.place_id}
                      onClick={() => onPickPlace(s.place_id, s.description)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <span className="text-sm">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
              {formatted && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Dirección formateada: {formatted}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Lat</label>
                <Input value={lat ?? ''} onChange={(e) => setLat(e.target.value ? Number(e.target.value) : null)} placeholder="-34.60" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Lng</label>
                <Input value={lng ?? ''} onChange={(e) => setLng(e.target.value ? Number(e.target.value) : null)} placeholder="-58.38" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="pillGreen" className="rounded-lg" onClick={onSave} disabled={saving || !tenantUuid}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
            {loading && <p className="text-sm text-slate-500">Cargando…</p>}
          </div>
        </Card>

        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Próximamente: Notificaciones, Facturación, Equipos/Proyectos, i18n.</p>
        </div>
      </main>
    </div>
  );
};

export default Settings;
