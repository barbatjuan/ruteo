/* API helpers with mock implementation */
import { getGoogle } from './google';
const BASE = import.meta.env.VITE_API_URL || '';
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const GOOGLE_LANG = (import.meta.env.VITE_GOOGLE_MAPS_LANG as string | undefined) || 'es';
const GOOGLE_REGION = (import.meta.env.VITE_GOOGLE_MAPS_REGION as string | undefined) || 'ES';
const PLACES_LOCATION_BIAS = (import.meta.env.VITE_PLACES_LOCATION_BIAS as string | undefined) || '';
const PLACES_RADIUS_METERS = +(import.meta.env.VITE_PLACES_RADIUS_METERS as string | undefined || '0');

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
  // Session token to improve accuracy/billing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = window as any;
  if (!w.__placesSessionToken && google.maps.places?.AutocompleteSessionToken) {
    w.__placesSessionToken = new google.maps.places.AutocompleteSessionToken();
  }
  const sessionToken = w.__placesSessionToken ?? undefined;
  const service = new google.maps.places.AutocompleteService();
  // Optional location bias
  let locationBias: any = undefined;
  if (PLACES_LOCATION_BIAS) {
    const [latStr, lngStr] = PLACES_LOCATION_BIAS.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng) && PLACES_RADIUS_METERS > 0) {
      locationBias = { center: new google.maps.LatLng(lat, lng), radius: PLACES_RADIUS_METERS };
    }
  }
  return new Promise<{ description: string; place_id: string }[]>((resolve: (v: { description: string; place_id: string }[]) => void) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: GOOGLE_REGION ? { country: GOOGLE_REGION } : undefined,
        language: GOOGLE_LANG,
        sessionToken,
        locationBias,
      } as any,
      (preds: any, status: any) => {
        if (!preds || status !== google.maps.places.PlacesServiceStatus.OK) {
          resolve([]);
          return;
        }
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
  // Reuse session token if present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = window as any;
  const sessionToken = w.__placesSessionToken ?? undefined;
  return new Promise<{ lat: number; lng: number; normalized: string }>((resolve: (v: { lat: number; lng: number; normalized: string }) => void, reject: (e: any) => void) => {
    places.getDetails({ placeId, fields: ['geometry.location', 'formatted_address'], sessionToken } as any, (res: any, status: any) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !res || !res.geometry || !res.geometry.location) {
        reject(new Error('Place details no encontrado'));
        return;
      }
      // End the autocomplete session after successful selection
      if (w.__placesSessionToken) w.__placesSessionToken = undefined;
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

export type RouteOptions = { origin?: { lat: number; lng: number; address: string } | null; roundTrip?: boolean };
export async function calculateOptimizedRoute(points: { lat: number; lng: number; address: string }[], opts?: RouteOptions, tenantId?: string) {
  // Prefer custom backend if provided
  if (BASE) {
    const res = await fetch(`${BASE}/calculate-route`, { method: 'POST', headers: headers(tenantId), body: JSON.stringify({ points, options: opts || {} }) });
    return res.json();
  }
  // Use Google Maps JS DirectionsService to avoid CORS
  if (GOOGLE_KEY && typeof window !== 'undefined' && points.length >= 1) {
    const google = await getGoogle(GOOGLE_KEY, GOOGLE_LANG, GOOGLE_REGION);
    const g: any = google.maps;
    const svc = new g.DirectionsService();
    const hasOrigin = !!opts?.origin;
    const roundTrip = !!opts?.roundTrip;
    const originPoint = hasOrigin ? (opts!.origin as any) : points[0];
    // remove any stop equal to origin (same lat/lng)
    const stopsOnly = points.filter((p) => Math.abs(p.lat - originPoint.lat) > 1e-6 || Math.abs(p.lng - originPoint.lng) > 1e-6);

    let originLL = new g.LatLng(originPoint.lat, originPoint.lng);
    let destinationLL: any;
    let waypointPoints: { lat: number; lng: number; address: string }[] = [];

    if (hasOrigin && stopsOnly.length === 0) {
      // Only origin provided
      return { stops: [{ ...originPoint, idx: 0, eta: 0 }], polyline: [[originPoint.lat, originPoint.lng]], distance_km: 0, duration_min: 0 };
    }

    if (hasOrigin) {
      if (roundTrip) {
        destinationLL = originLL;
        waypointPoints = stopsOnly;
      } else {
        // choose farthest point from origin as destination
        const dist2 = (a: any, b: any) => {
          const dx = a.lat - b.lat; const dy = a.lng - b.lng; return dx * dx + dy * dy;
        };
        let maxIdx = 0; let maxD = -1;
        stopsOnly.forEach((p, i) => { const d = dist2(p, originPoint); if (d > maxD) { maxD = d; maxIdx = i; } });
        const destPoint = stopsOnly[maxIdx];
        destinationLL = new g.LatLng(destPoint.lat, destPoint.lng);
        waypointPoints = stopsOnly.filter((_, i) => i !== maxIdx);
      }
    } else {
      destinationLL = new g.LatLng(points[points.length - 1].lat, points[points.length - 1].lng);
      waypointPoints = points.slice(1, -1);
    }

    const waypoints = waypointPoints.map((p) => ({ location: new g.LatLng(p.lat, p.lng), stopover: true }));
    const req: any = {
      origin: originLL,
      destination: destinationLL,
      waypoints,
      optimizeWaypoints: true,
      travelMode: g.TravelMode.DRIVING,
    };
    const callRoute = () => new Promise((resolve, reject) => {
      svc.route(req, (res: any, status: any) => {
        if (status === 'OK' && res) resolve(res);
        else reject(new Error(`Directions failed: ${status}`));
      });
    });
    let result: any;
    try {
      result = await callRoute();
    } catch (e: any) {
      // Retry once on UNKNOWN_ERROR
      if (String(e?.message || '').includes('UNKNOWN_ERROR')) {
        result = await callRoute();
      } else {
        throw e;
      }
    }
    const route = result.routes?.[0];
    if (!route) {
      const seq = hasOrigin ? [originPoint, ...stopsOnly, ...(roundTrip ? [originPoint] : [])] : points;
      const stops = seq.map((p, idx) => ({ idx, ...p, eta: 5 * (idx + 1) }));
      const polyline = seq.map((p) => [p.lat, p.lng]);
      return { stops, polyline, distance_km: 0, duration_min: 0 };
    }
    const order: number[] = route.waypoint_order || [];
    let sequence: { lat: number; lng: number; address: string }[] = [];
    if (hasOrigin) {
      sequence = [originPoint];
      for (const i of order) sequence.push(waypointPoints[i]);
      sequence.push(roundTrip ? originPoint : (destinationLL ? { lat: destinationLL.lat(), lng: destinationLL.lng(), address: waypointPoints.length ? 'Destino' : originPoint.address } as any : originPoint));
    } else {
      sequence = [points[0]];
      for (const i of order) sequence.push(points[1 + i]);
      sequence.push(points[points.length - 1]);
    }
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
