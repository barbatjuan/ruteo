/* API helpers with mock implementation */
import { getGoogle } from './google';
const BASE = import.meta.env.VITE_API_URL || '';
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const GOOGLE_LANG = (import.meta.env.VITE_GOOGLE_MAPS_LANG as string | undefined) || 'es';
const GOOGLE_REGION = (import.meta.env.VITE_GOOGLE_MAPS_REGION as string | undefined) || 'ES';

function headers(tenantId?: string, token?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId && (import.meta.env.VITE_TENANT_MODE === 'header' || !BASE)) h['X-Tenant-Id'] = tenantId;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// Lightweight Places Autocomplete using Google Places API
export async function autocompletePlaces(query: string) {
  if (!query || query.trim().length < 3) return [] as { description: string; place_id: string }[];
  // Prefer backend if it exposes an autocomplete endpoint
  if (BASE) {
    try {
      const res = await fetch(`${BASE}/places/autocomplete?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return (await res.json()) as { description: string; place_id: string }[];
    } catch {
      return [];
    }
  }
  if (!GOOGLE_KEY || typeof window === 'undefined') return [];
  const google = await getGoogle(GOOGLE_KEY, GOOGLE_LANG, GOOGLE_REGION);
  const service = new google.maps.places.AutocompleteService();
  return new Promise<{ description: string; place_id: string }[]>((resolve: (v: { description: string; place_id: string }[]) => void) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: GOOGLE_REGION ? { country: GOOGLE_REGION } : undefined,
        language: GOOGLE_LANG,
      } as any,
      (preds: any) => {
        const out = (preds || []).map((p: any) => ({ description: p.description, place_id: p.place_id }));
        resolve(out);
      }
    );
  });
}

// Resolve lat/lng from a Google place_id
export async function geocodeByPlaceId(placeId: string) {
  if (!placeId) throw new Error('placeId requerido');
  // Prefer backend if it exposes a place-details endpoint
  if (BASE) {
    const res = await fetch(`${BASE}/places/details?place_id=${encodeURIComponent(placeId)}`);
    return res.json();
  }
  if (!GOOGLE_KEY || typeof window === 'undefined') throw new Error('Falta GOOGLE_MAPS_API_KEY');
  const google = await getGoogle(GOOGLE_KEY, GOOGLE_LANG, GOOGLE_REGION);
  const places = new google.maps.places.PlacesService(document.createElement('div'));
  return new Promise<{ lat: number; lng: number; normalized: string }>((resolve: (v: { lat: number; lng: number; normalized: string }) => void, reject: (e: any) => void) => {
    places.getDetails({ placeId, fields: ['geometry.location', 'formatted_address'] } as any, (res: any, status: any) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !res || !res.geometry || !res.geometry.location) {
        reject(new Error('Place details no encontrado'));
        return;
      }
      resolve({ lat: res.geometry.location.lat(), lng: res.geometry.location.lng(), normalized: res.formatted_address || '' });
    });
  });
}

export async function geocodeAddresses(addresses: { address: string }[], tenantId?: string) {
  // Prefer custom backend if provided
  if (BASE) {
    const res = await fetch(`${BASE}/geocode`, { method: 'POST', headers: headers(tenantId), body: JSON.stringify(addresses) });
    return res.json();
  }
  // Use Google Maps JS Geocoder to avoid CORS
  if (GOOGLE_KEY && typeof window !== 'undefined') {
    const google = await getGoogle(GOOGLE_KEY, GOOGLE_LANG, GOOGLE_REGION);
    const geocoder = new google.maps.Geocoder();
    const out: { address: string; lat: number; lng: number; normalized: string }[] = [];
    for (const item of addresses) {
      try {
        const res = await geocoder.geocode({ address: item.address, componentRestrictions: GOOGLE_REGION ? { country: GOOGLE_REGION } : undefined } as any);
        const r = res.results?.[0];
        if (r) out.push({ address: item.address, lat: r.geometry.location.lat(), lng: r.geometry.location.lng(), normalized: r.formatted_address });
      } catch {
        // skip
      }
    }
    return out;
  }
  // Fallback mock (no backend and no Google key)
  return addresses.map((a, i) => ({ address: a.address, lat: 40.4168 + i * 0.002, lng: -3.7038 - i * 0.002, normalized: a.address }));
}

export async function calculateOptimizedRoute(points: { lat: number; lng: number; address: string }[], tenantId?: string) {
  // Prefer custom backend if provided
  if (BASE) {
    const res = await fetch(`${BASE}/calculate-route`, { method: 'POST', headers: headers(tenantId), body: JSON.stringify(points) });
    return res.json();
  }
  // Use Google Maps JS DirectionsService to avoid CORS
  if (GOOGLE_KEY && typeof window !== 'undefined' && points.length >= 2) {
    const google = await getGoogle(GOOGLE_KEY, GOOGLE_LANG, GOOGLE_REGION);
    const g: any = google.maps;
    const svc = new g.DirectionsService();
    const origin = new g.LatLng(points[0].lat, points[0].lng);
    const destination = new g.LatLng(points[points.length - 1].lat, points[points.length - 1].lng);
    const mid = points.slice(1, -1);
    const waypoints = mid.map((p) => ({ location: new g.LatLng(p.lat, p.lng), stopover: true }));
    const req: any = {
      origin,
      destination,
      waypoints,
      optimizeWaypoints: true,
      travelMode: g.TravelMode.DRIVING,
    };
    const result: any = await new Promise((resolve, reject) => {
      svc.route(req, (res: any, status: any) => {
        if (status === 'OK' && res) resolve(res);
        else reject(new Error(`Directions failed: ${status}`));
      });
    });
    const route = result.routes?.[0];
    if (!route) {
      const stops = points.map((p, idx) => ({ idx, ...p, eta: 5 * (idx + 1) }));
      const polyline = points.map((p) => [p.lat, p.lng]);
      return { stops, polyline, distance_km: 0, duration_min: 0 };
    }
    const order: number[] = route.waypoint_order || [];
    const sequence: { lat: number; lng: number; address: string }[] = [points[0]];
    for (const i of order) sequence.push(points[1 + i]);
    sequence.push(points[points.length - 1]);
    const legs = route.legs || [];
    const distance_m = legs.reduce((sum: number, l: any) => sum + (l.distance?.value || 0), 0);
    const duration_s = legs.reduce((sum: number, l: any) => sum + (l.duration?.value || 0), 0);
    const stops = sequence.map((p, idx) => ({ idx, ...p, eta: Math.round((duration_s / 60) * ((idx + 1) / sequence.length)) }));
    const polyline = sequence.map((p) => [p.lat, p.lng]);
    return { stops, polyline, distance_km: +(distance_m / 1000).toFixed(1), duration_min: Math.round(duration_s / 60) };
  }
  // Fallback mock
  const stops = points.map((p, idx) => ({ idx, ...p, eta: 5 * (idx + 1) }));
  const polyline = points.map((p) => [p.lat, p.lng]);
  return { stops, polyline, distance_km: 10.2, duration_min: 35 };
}

export async function listClients() { return []; }
export async function createClient() { return { ok: true }; }
export async function importClientsCSV() { return { ok: true }; }
export async function listRoutes() { return []; }
