import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stop } from '../state/RouteContext';
import { getGoogle } from '../lib/google';

type LatLng = { lat: number; lng: number; label?: string };

const demoPoints: LatLng[] = [];
const MONTEVIDEO = { lat: -34.9011, lng: -56.1645 };

const GoogleMapView: React.FC<{ height?: string; points?: LatLng[] }> = ({ height = '400px', points }) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const language = (import.meta.env.VITE_GOOGLE_MAPS_LANG as string) || 'es';
  const region = (import.meta.env.VITE_GOOGLE_MAPS_REGION as string) || 'ES';
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const pts = useMemo(() => points && points.length ? points : demoPoints, [points]);
  const [polylineObj, setPolylineObj] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    getGoogle(apiKey, language, region)
      .then(() => {
        if (cancelled) return;
        setReady(true);
      })
      .catch((e) => console.error(e));
    return () => { cancelled = true; };
  }, [apiKey, language, region]);

  useEffect(() => {
    if (!ready || !mapEl.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = (window as any).google;
    if (!g?.maps) return;

    const center = pts.length ? { lat: pts[0].lat, lng: pts[0].lng } : MONTEVIDEO;
    const map = new g.maps.Map(mapEl.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    if (pts.length === 0) return;

    // Markers
    pts.forEach((p, idx) => new g.maps.Marker({ position: { lat: p.lat, lng: p.lng }, label: p.label ?? String(idx + 1), map }));

    // Basic polyline connecting stops in provided order (no extra API call)
    const path = pts.map((p) => ({ lat: p.lat, lng: p.lng }));
    const pl = new g.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map,
    });
    setPolylineObj(pl);
    // Fit bounds to all points
    const bounds = new g.maps.LatLngBounds();
    path.forEach((ll) => bounds.extend(new g.maps.LatLng(ll.lat, ll.lng)));
    map.fitBounds(bounds);
  }, [ready, pts]);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ height }}>
      <div ref={mapEl} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default GoogleMapView;
