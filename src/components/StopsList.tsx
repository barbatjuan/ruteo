import React from 'react';
import { useRoute } from '../state/RouteContext';

const StopsList: React.FC = () => {
  const { stops, removeStop, clearStops, setStops, setOptimizeWaypoints } = useRoute();

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setStops(next);
    setOptimizeWaypoints(false);
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <h2 className="font-semibold mb-2">Paradas</h2>
      {stops.length === 0 ? (
        <p className="text-sm text-slate-500">No hay paradas. Agrega direcciones para verlas aquí.</p>
      ) : (
        <ul className="space-y-1">
          {stops.map((s, idx) => (
            <li key={s.id} className="px-3 py-2 rounded-lg flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col">
                  <button aria-label="Subir" className="text-xs rounded border border-slate-300 dark:border-slate-700 px-2 py-0.5 disabled:opacity-40" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                  <button aria-label="Bajar" className="mt-1 text-xs rounded border border-slate-300 dark:border-slate-700 px-2 py-0.5 disabled:opacity-40" onClick={() => move(idx, 1)} disabled={idx === stops.length - 1}>↓</button>
                </div>
                <span className="truncate"><b>{idx + 1}.</b> {s.address}</span>
              </div>
              <button className="text-xs text-red-600" onClick={() => removeStop(s.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      {stops.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl border border-slate-300 dark:border-slate-700 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={clearStops}>Limpiar</button>
          <button className="rounded-xl bg-indigo-600 text-white py-2" onClick={() => setOptimizeWaypoints(true)}>Re-optimizar ruta</button>
        </div>
      )}
    </div>
  );
};

export default StopsList;
