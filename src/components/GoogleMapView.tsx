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
  const [directions, setDirections] = useState<any>(null);

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

    if (pts.length === 1) {
      new g.maps.Marker({ position: { lat: pts[0].lat, lng: pts[0].lng }, label: pts[0].label ?? '1', map });
      map.setCenter({ lat: pts[0].lat, lng: pts[0].lng });
      return;
    }

    // Directions (roads) with waypoint optimization
    const origin = new g.maps.LatLng(pts[0].lat, pts[0].lng);
    const destination = new g.maps.LatLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng);
    const waypoints = pts.slice(1, -1).map((p) => ({ location: new g.maps.LatLng(p.lat, p.lng), stopover: true }));
    const service = new g.maps.DirectionsService();
    const renderer = new g.maps.DirectionsRenderer({ map, suppressMarkers: false });
    service.route({
      origin,
      destination,
      waypoints,
      optimizeWaypoints: true,
      travelMode: g.maps.TravelMode.DRIVING,
    }, (result: any, status: any) => {
      if (status === 'OK' && result) {
        renderer.setDirections(result);
        setDirections(result);
      } else {
        console.warn('Directions request failed', status);
        // fallback: markers
        pts.forEach((p, idx) => new g.maps.Marker({ position: { lat: p.lat, lng: p.lng }, label: p.label ?? String(idx + 1), map }));
      }
    });
  }, [ready, pts]);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ height }}>
      <div ref={mapEl} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default GoogleMapView;
