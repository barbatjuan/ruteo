import React from 'react';
import { useRoute } from '../state/RouteContext';

const StopsList: React.FC = () => {
  const { stops, removeStop, clearStops } = useRoute();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <h2 className="font-semibold mb-2">Paradas</h2>
      {stops.length === 0 ? (
        <p className="text-sm text-slate-500">No hay paradas. Agrega direcciones para verlas aquí.</p>
      ) : (
        <ul className="space-y-1">
          {stops.map((s, idx) => (
            <li key={s.id} className="px-3 py-2 rounded-lg flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
              <span>{(s.label ?? String(idx + 1))}. {s.address}</span>
              <button className="text-xs text-red-600" onClick={() => removeStop(s.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      {stops.length > 0 && (
        <button className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={clearStops}>Limpiar</button>
      )}
    </div>
  );
};

export default StopsList;
