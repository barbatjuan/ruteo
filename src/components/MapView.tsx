import React, { useMemo, useState } from 'react';
import GoogleMapView from './GoogleMapView';
import { useRoute } from '../state/RouteContext';
import Button from './ui/Button';

const MapView: React.FC = () => {
  const { stops } = useRoute();
  const [expanded, setExpanded] = useState(false);
  const points = useMemo(() => stops.map((s) => ({ lat: s.lat!, lng: s.lng!, label: s.label })), [stops]);
  const height = expanded ? '64vh' : '360px';

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="absolute z-10 right-3 top-3">
        <Button size="sm" variant="pillGray" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Reducir mapa' : 'Expandir mapa'}
        </Button>
      </div>
      <GoogleMapView height={height} points={points} />
    </div>
  );
};

export default MapView;
