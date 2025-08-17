import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { useRoute } from '../state/RouteContext';
import { listClientsSB, upsertAddressSB } from '../lib/supabaseClients';
import type { Client } from '../lib/clients';
import { geocodeAddresses } from '../lib/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

type Props = { open: boolean; onClose: () => void };

const ClientPicker: React.FC<Props> = ({ open, onClose }) => {
  const { tenantUuid } = useTenant();
  const { error, success } = useToast();
  const { addStop } = useRoute();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      if (!tenantUuid) return;
      try {
        setLoading(true);
        const rows = await listClientsSB(tenantUuid);
        setClients(rows);
      } catch (e) {
        console.error(e);
        error('No se pudieron cargar clientes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, tenantUuid]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(t) || (c.phone || '').toLowerCase().includes(t));
  }, [q, clients]);

  const addAddressToRoute = async (clientId: string, address: { id: string; address: string; label?: string; lat?: number; lng?: number }) => {
    try {
      let lat = address.lat; let lng = address.lng;
      if (lat === undefined || lng === undefined) {
        const res = await geocodeAddresses([{ address: address.address }], tenantUuid || undefined);
        if (res && res[0]) { lat = res[0].lat; lng = res[0].lng; }
        if (lat !== undefined && lng !== undefined && tenantUuid) {
          await upsertAddressSB(clientId, { id: address.id, label: address.label, address: address.address, lat, lng }, tenantUuid);
        }
      }
      if (lat === undefined || lng === undefined) { error('No se pudo geocodificar la dirección'); return; }
      addStop({ address: address.address, lat, lng, label: address.label });
      success('Cliente agregado a la ruta');
      onClose();
    } catch (e) {
      console.error(e);
      error('No se pudo agregar a la ruta');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar cliente a la ruta">
      <div className="p-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="w-72" placeholder="Buscar por nombre o teléfono" aria-label="Buscar clientes" />
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
      <div>
        {loading ? (
          <div className="p-6 text-sm text-slate-600 dark:text-slate-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600 dark:text-slate-400">No hay clientes.</div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((c) => (
              <li key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{c.phone || 'Sin teléfono'} {c.notes ? `· ${c.notes}` : ''}</div>
                  </div>
                </div>
                <div className="mt-2 pl-1">
                  {c.addresses.length === 0 ? (
                    <div className="text-xs text-slate-500">Sin direcciones</div>
                  ) : (
                    <ul className="grid md:grid-cols-2 gap-2">
                      {c.addresses.map((a) => (
                        <li key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium">{a.label || 'Sin etiqueta'}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 truncate" title={a.address}>{a.address}</div>
                          </div>
                          <Button size="sm" onClick={() => addAddressToRoute(c.id, a)}>Agregar</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default ClientPicker;
