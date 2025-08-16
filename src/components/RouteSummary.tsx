import React from 'react';
import { useRoute } from '../state/RouteContext';

const RouteSummary: React.FC = () => {
  const { routeInfo, stops } = useRoute();
  if (!routeInfo || stops.length < 2) return null;
  const { distance_km, duration_min } = routeInfo;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <h3 className="font-semibold mb-2">Resumen de ruta</h3>
      <div className="text-sm text-slate-700 dark:text-slate-300 flex gap-6">
        <div><span className="font-medium">Distancia:</span> {distance_km.toFixed(1)} km</div>
        <div><span className="font-medium">Duración:</span> {Math.round(duration_min)} min</div>
        <div><span className="font-medium">Paradas:</span> {stops.length}</div>
      </div>
    </div>
  );
};

export default RouteSummary;
