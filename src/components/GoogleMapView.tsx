import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stop } from '../state/RouteContext';
import { getGoogle } from '../lib/google';
import { useRoute } from '../state/RouteContext';

type LatLng = { lat: number; lng: number; label?: string };

const demoPoints: LatLng[] = [];
const MONTEVIDEO = { lat: -34.9011, lng: -56.1645 };

const GoogleMapView: React.FC<{ height?: string; points?: LatLng[] }> = ({ height = '400px', points }) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const language = (import.meta.env.VITE_GOOGLE_MAPS_LANG as string) || 'es';
  const region = (import.meta.env.VITE_GOOGLE_MAPS_REGION as string) || 'ES';
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const requestIdRef = useRef<number>(0);
  const debounceRef = useRef<number | null>(null);
  const directionsRendererRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const pts = useMemo(() => points && points.length ? points : demoPoints, [points]);
  const [polylineObj, setPolylineObj] = useState<any>(null);
  const { optimizeWaypoints, setRouteInfo, setRouteLoading } = useRoute();

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

  // Initialize the map only once
  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return;
    const g: any = (window as any).google;
    if (!g?.maps) return;
    const center = pts.length ? { lat: pts[0].lat, lng: pts[0].lng } : MONTEVIDEO;
    mapRef.current = new g.maps.Map(mapEl.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [ready]);

  // Update markers and routes without recreating the map (prevents flicker)
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g: any = (window as any).google;
    const map = mapRef.current;

    // Compute if we are returning to origin (last point equals first)
    const sameLL = (a: any, b: any) => Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
    const returningToOrigin = pts.length >= 2 && sameLL(pts[0], pts[pts.length - 1]);
    const markerPts = returningToOrigin ? pts.slice(0, -1) : pts;

    // Update or create markers without full teardown to avoid flicker
    const gmarkers = markersRef.current;
    // Trim extra markers
    while (gmarkers.length > markerPts.length) {
      const m = gmarkers.pop();
      try { m.setMap(null); } catch {}
    }
    // Update existing marker positions/labels
    for (let i = 0; i < gmarkers.length; i++) {
      const p = markerPts[i];
      const m = gmarkers[i];
      try {
        m.setPosition(new g.maps.LatLng(p.lat, p.lng));
        const label = i === 0 ? '0' : (p.label ?? String(i));
        m.setLabel(label);
      } catch {}
    }
    // Create missing markers
    for (let i = gmarkers.length; i < markerPts.length; i++) {
      const p = markerPts[i];
      const label = i === 0 ? '0' : (p.label ?? String(i));
      const m = new g.maps.Marker({ position: { lat: p.lat, lng: p.lng }, label, map });
      gmarkers.push(m);
    }

    if (markerPts.length === 0) {
      // Clear any existing route drawing
      if (directionsRendererRef.current) {
        try { directionsRendererRef.current.setMap(null); } catch {}
        directionsRendererRef.current = null;
      }
      if (polylineObj) { try { polylineObj.setMap(null); } catch {} ; setPolylineObj(null); }
      try { setRouteLoading(false); } catch {}
      return;
    }

    // If only one point, center and exit
    if (markerPts.length === 1) {
      map.setCenter({ lat: markerPts[0].lat, lng: markerPts[0].lng });
      map.setZoom(14);
      if (directionsRendererRef.current) {
        try { directionsRendererRef.current.setMap(null); } catch {}
        directionsRendererRef.current = null;
      }
      if (polylineObj) { try { polylineObj.setMap(null); } catch {} ; setPolylineObj(null); }
      try { setRouteLoading(false); } catch {}
      return;
    }

    // Debounce the Directions request to avoid bursts
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => {
      try {
        const svc = new g.maps.DirectionsService();
        const origin = new g.maps.LatLng(pts[0].lat, pts[0].lng);
        // If returning to origin, destination should be origin to get a closed loop
        const destination = returningToOrigin
          ? new g.maps.LatLng(pts[0].lat, pts[0].lng)
          : new g.maps.LatLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng);
        const waypoints = (returningToOrigin ? pts.slice(1, -1) : pts.slice(1, -1))
          .map((p: any) => ({ location: new g.maps.LatLng(p.lat, p.lng), stopover: true }));
        const req: any = { origin, destination, waypoints, travelMode: g.maps.TravelMode.DRIVING, optimizeWaypoints, provideRouteAlternatives: false };

        const currentId = ++requestIdRef.current;
        try { setRouteLoading(true); } catch {}
        svc.route(req, (res: any, status: any) => {
          // Ignore stale callbacks
          if (currentId !== requestIdRef.current) { try { setRouteLoading(false); } catch {} ; return; }
          if (status !== 'OK' || !res || !res.routes || !res.routes[0]) {
            // Clear renderer if any
            if (directionsRendererRef.current) {
              try { directionsRendererRef.current.setMap(null); } catch {}
              directionsRendererRef.current = null;
            }
            // Fallback: draw straight polyline if directions fail
            const path = pts.map((p) => ({ lat: p.lat, lng: p.lng }));
            // Remove previous fallback only now that we will replace it
            if (polylineObj) { try { polylineObj.setMap(null); } catch {} }
            const pl = new g.maps.Polyline({ path, geodesic: true, strokeColor: '#1d4ed8', strokeOpacity: 0.8, strokeWeight: 4, map });
            setPolylineObj(pl);
            const bounds = new g.maps.LatLngBounds();
            path.forEach((ll) => bounds.extend(new g.maps.LatLng(ll.lat, ll.lng)));
            try { map.fitBounds(bounds); } catch {}
            try { setRouteLoading(false); } catch {}
            return;
          }
          const route = res.routes[0];
          // Compute total distance (km) and duration (min)
          try {
            const legs = route.legs || [];
            const totalMeters = legs.reduce((acc: number, l: any) => acc + (l.distance?.value || 0), 0);
            const totalSecs = legs.reduce((acc: number, l: any) => acc + (l.duration?.value || 0), 0);
            setRouteInfo({ distance_km: totalMeters / 1000, duration_min: totalSecs / 60 });
          } catch {}
          // Use DirectionsRenderer to draw the route to avoid flicker
          if (!directionsRendererRef.current) {
            directionsRendererRef.current = new g.maps.DirectionsRenderer({
              map,
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#1d4ed8', strokeOpacity: 0.9, strokeWeight: 5 },
            });
          }
          try { directionsRendererRef.current.setDirections(res); } catch {}
          // Remove any fallback polyline since we have a proper route
          if (polylineObj) { try { polylineObj.setMap(null); } catch {} ; setPolylineObj(null); }
          // Fit bounds using route bounds
          try {
            const bounds = res.routes[0].bounds;
            if (bounds) map.fitBounds(bounds);
          } catch {}
          try { setRouteLoading(false); } catch {}
        });
      } catch {
        try { setRouteLoading(false); } catch {}
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [ready, pts, optimizeWaypoints]);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ height }}>
      <div ref={mapEl} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default GoogleMapView;
