import React from 'react';
import { useRoute } from '../state/RouteContext';
import Button from './ui/Button';

const StopsList: React.FC = () => {
  const { stops, removeStop, clearStops, setStops, setOptimizeWaypoints } = useRoute();

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops].map((stop, i) => ({
      ...stop,
      label: String(i + 1) // Renumerar labels
    }));
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    // Renumerar después del intercambio
    const reordered = next.map((stop, i) => ({
      ...stop,
      label: String(i + 1)
    }));
    setStops(reordered);
    // Forzar recalculo: alternamos el flag para disparar useEffect en GoogleMapView
    setOptimizeWaypoints((v) => !v);
  };
  return (
    <div>
      {stops.length === 0 ? (
        <p className="text-sm text-slate-500">No hay paradas. Agrega direcciones para verlas aquí.</p>
      ) : (
        <ul className="space-y-2">
          {stops.map((s, idx) => (
            <li key={s.id} className="px-3 py-2 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 gap-3 text-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col">
                  <button aria-label="Subir" className="text-xs rounded-full border border-slate-300 dark:border-slate-700 w-7 h-7 disabled:opacity-40" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                  <button aria-label="Bajar" className="mt-1 text-xs rounded-full border border-slate-300 dark:border-slate-700 w-7 h-7 disabled:opacity-40" onClick={() => move(idx, 1)} disabled={idx === stops.length - 1}>↓</button>
                </div>
                <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">{idx + 1}</div>
                <span className="truncate text-slate-900 dark:text-slate-100">{s.address}</span>
              </div>
              <Button size="sm" variant="pillRed" onClick={() => removeStop(s.id)}>Quitar</Button>
            </li>
          ))}
        </ul>
      )}
      {stops.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="pillYellow" onClick={clearStops}>Limpiar</Button>
          <Button variant="pillBlue" onClick={() => setOptimizeWaypoints((v) => !v)}>Re-optimizar ruta</Button>
        </div>
      )}
    </div>
  );
};

export default StopsList;

