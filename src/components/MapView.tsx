import React from 'react';
import GoogleMapView from './GoogleMapView';
import { useRoute } from '../state/RouteContext';

type Props = { height?: string };

const MapView: React.FC<Props> = ({ height = '400px' }) => {
  const { stops } = useRoute();
  const points = stops.map((s, i) => ({ lat: s.lat, lng: s.lng, label: String(i + 1) }));
  return <GoogleMapView height={height} points={points} />;
};

export default MapView;
