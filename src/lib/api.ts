/* API helpers with mock implementation */
const BASE = import.meta.env.VITE_API_URL || '';

function headers(tenantId?: string, token?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId && (import.meta.env.VITE_TENANT_MODE === 'header' || !BASE)) h['X-Tenant-Id'] = tenantId;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function geocodeAddresses(addresses: { address: string }[], tenantId?: string) {
  if (!BASE) {
    // mock: return fake coords
    return addresses.map((a, i) => ({ address: a.address, lat: 40.4168 + i * 0.002, lng: -3.7038 - i * 0.002, normalized: a.address }));
  }
  const res = await fetch(`${BASE}/geocode`, { method: 'POST', headers: headers(tenantId), body: JSON.stringify(addresses) });
  return res.json();
}

export async function calculateOptimizedRoute(points: { lat: number; lng: number; address: string }[], tenantId?: string) {
  if (!BASE) {
    const stops = points.map((p, idx) => ({ idx, ...p, eta: 5 * (idx + 1) }));
    const polyline = points.map((p) => [p.lat, p.lng]);
    return { stops, polyline, distance_km: 10.2, duration_min: 35 };
  }
  const res = await fetch(`${BASE}/calculate-route`, { method: 'POST', headers: headers(tenantId), body: JSON.stringify(points) });
  return res.json();
}

export async function listClients() { return []; }
export async function createClient() { return { ok: true }; }
export async function importClientsCSV() { return { ok: true }; }
export async function listRoutes() { return []; }
