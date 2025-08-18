import React from 'react';
import { useRoute } from '../state/RouteContext';

const RouteSummary: React.FC = () => {
  const { routeInfo, /* routeLoading */ stops } = useRoute();
  if (stops.length < 2) return null;
  return (
    <div>
      <h3 className="font-semibold mb-2">Resumen de ruta</h3>
      {routeInfo ? (
        <div className="text-sm text-slate-700 dark:text-slate-300 flex gap-6">
          <div><span className="font-medium">Distancia:</span> {routeInfo.distance_km.toFixed(1)} km</div>
          <div><span className="font-medium">Duración:</span> {Math.round(routeInfo.duration_min)} min</div>
          <div><span className="font-medium">Paradas:</span> {stops.length}</div>
        </div>
      ) : (
        <div className="text-sm text-slate-600 dark:text-slate-400">Sin datos de ruta</div>
      )}
    </div>
  );
};

export default RouteSummary;
