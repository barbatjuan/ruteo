import axios from 'axios';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

function cfg() {
  const key = process.env.GOOGLE_MAPS_API_KEY || '';
  const language = process.env.GOOGLE_MAPS_LANG || 'es';
  const region = process.env.GOOGLE_MAPS_REGION || 'UY';
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not set');
  return { key, language, region };
}

export async function placesAutocomplete(input: string, session?: string) {
  const { key, language, region } = cfg();
  const params: Record<string, string> = { input, key, language, region };
  if (session) params.sessiontoken = session;
  const { data } = await axios.get(`${PLACES_BASE}/autocomplete/json`, { params });
  return data;
}

export async function placeDetails(place_id: string, session?: string) {
  const { key, language, region } = cfg();
  const params: Record<string, string> = {
    place_id,
    key,
    language,
    region,
    fields: 'place_id,formatted_address,geometry,name,address_component'
  };
  if (session) params.sessiontoken = session;
  const { data } = await axios.get(`${PLACES_BASE}/details/json`, { params });
  return data;
}

export async function geocodeAddress(address: string) {
  const { key, language, region } = cfg();
  const params = { address, key, language, region };
  const { data } = await axios.get(GEOCODE_BASE, { params });
  return data;
}

type Point = { lat: number; lng: number; address?: string };

export async function directionsRoute(points: Point[], options?: { origin?: Point; roundTrip?: boolean }) {
  const { key, language, region } = cfg();
  if (!points || points.length < 2) {
    return { routes: [], status: 'NOT_ENOUGH_POINTS' };
  }
  // Build origin, destination, waypoints based on options
  let origin: Point;
  let destination: Point;
  let way: Point[] = [];
  const roundTrip = !!options?.roundTrip;
  if (options?.origin) {
    origin = options.origin;
    const rest = points.filter((p) => !(Math.abs(p.lat - origin.lat) < 1e-6 && Math.abs(p.lng - origin.lng) < 1e-6));
    if (roundTrip) {
      destination = origin;
      way = rest;
    } else {
      // choose farthest from origin as destination
      const withD = rest.map((p) => ({ p, d: Math.hypot(p.lat - origin.lat, p.lng - origin.lng) }));
      withD.sort((a, b) => b.d - a.d);
      destination = withD[0]?.p || rest[rest.length - 1];
      way = rest.filter((p) => p !== destination);
    }
  } else {
    // fallback: first is origin, last is destination
    origin = points[0];
    destination = roundTrip ? points[0] : points[points.length - 1];
    way = points.slice(1, roundTrip ? points.length : points.length - 1);
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = `${destination.lat},${destination.lng}`;
  const wayStr = way.length ? `optimize:true|${way.map((w) => `${w.lat},${w.lng}`).join('|')}` : undefined;
  const params: Record<string, string> = {
    key,
    language,
    region,
    origin: originStr,
    destination: destStr,
    mode: 'driving',
  };
  if (wayStr) params.waypoints = wayStr;
  const { data } = await axios.get(DIRECTIONS_BASE, { params });
  return data;
}

export function sumRouteMetrics(directions: any) {
  try {
    const route = directions?.routes?.[0];
    const legs = route?.legs || [];
    const distance_m = legs.reduce((acc: number, l: any) => acc + (l.distance?.value || 0), 0);
    const duration_s = legs.reduce((acc: number, l: any) => acc + (l.duration?.value || 0), 0);
    return { distance_km: Math.round((distance_m / 1000) * 100) / 100, duration_min: Math.round((duration_s / 60) * 10) / 10 };
  } catch {
    return { distance_km: null, duration_min: null };
  }
}
