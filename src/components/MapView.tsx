import React from 'react';
import 'leaflet/dist/leaflet.css';

// Lazy import react-leaflet to avoid SSR issues in some environments
let MapContainer: any, TileLayer: any, Marker: any, Polyline: any, Popup: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer; TileLayer = RL.TileLayer; Marker = RL.Marker; Polyline = RL.Polyline; Popup = RL.Popup;
} catch {}

type Props = { height?: string; demo?: boolean };

const demoPoints = [
  { lat: 40.4168, lng: -3.7038, label: '1' },
  { lat: 40.418, lng: -3.702, label: '2' },
  { lat: 40.419, lng: -3.705, label: '3' },
];

const MapView: React.FC<Props> = ({ height = '400px', demo }) => {
  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ height }}>
      {MapContainer ? (
        <MapContainer center={[demoPoints[0].lat, demoPoints[0].lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {(demo ? demoPoints : demoPoints).map((p, idx) => (
            <Marker key={idx} position={[p.lat, p.lng]}>
              <Popup>Parada {idx + 1}</Popup>
            </Marker>
          ))}
          <Polyline positions={demoPoints.map((p) => [p.lat, p.lng]) as any} color="blue" />
        </MapContainer>
      ) : (
        <div className="h-full grid place-items-center text-slate-500">Mapa cargando...</div>
      )}
    </div>
  );
};

export default MapView;
