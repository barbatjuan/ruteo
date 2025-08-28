import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import { useTenant } from '../state/TenantContext';
import { useAuth } from '../state/AuthContext';
import {
  listDriverRoutesSB,
  getDriverRouteWithStopsSB,
  startRouteSB,
  finishRouteSB,
  arriveStopSB,
  completeStopSB,
  DriverRouteSummary,
} from '../lib/api';
import { getGoogle } from '../lib/google';
import { getSupabase } from '../lib/supabase';

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

// Map status to friendly ES label
const getStatusLabel = (status: string | null | undefined) => {
  switch ((status || '').toLowerCase()) {
    case 'planned':
      return 'Planificada';
    case 'pending':
      return 'Pendiente';
    case 'in_progress':
      return 'En recorrido';
    case 'completed':
    case 'done':
      return 'Completada';
    case 'cancelled':
      return 'Cancelada';
    case 'draft':
      return 'Borrador';
    default:
      return status || '';
  }
};

// Map status to badge colors (match Routes.tsx palette)
const getStatusStyle = (status: string | null | undefined) => {
  switch ((status || '').toLowerCase()) {
    case 'planned':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'in_progress':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    case 'completed':
    case 'done':
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    case 'draft':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

// Consider two points the same if within ~50m
const isSamePoint = (a: { lat: number; lng: number } | null | undefined, b: { lat: number; lng: number } | null | undefined) => {
  if (!a || !b) return false;
  const dLat = Math.abs(Number(a.lat) - Number(b.lat));
  const dLng = Math.abs(Number(a.lng) - Number(b.lng));
  return dLat < 0.0005 && dLng < 0.0005; // ~50m
};

const Driver: React.FC = () => {
  const { tenantUuid } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<DriverRouteSummary[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const today = useMemo(() => fmtDate(new Date()), []);
  // Google Maps refs
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsPolylinesRef = useRef<any[]>([]);
  const stopMarkersRef = useRef<any[]>([]);
  const [companyPos, setCompanyPos] = useState<{ lat: number; lng: number } | null>(null);

  // Cargar coordenadas de la empresa (tenant)
  useEffect(() => {
    const loadCompany = async () => {
      try {
        if (!tenantUuid) { setCompanyPos(null); return; }
        const sb = getSupabase(tenantUuid);
        const { data, error } = await sb
          .from('tenants')
          .select('company_lat, company_lng')
          .eq('uuid_id', tenantUuid)
          .maybeSingle();
        if (error) throw error;
        const lat = Number(data?.company_lat);
        const lng = Number(data?.company_lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) setCompanyPos({ lat, lng });
        else setCompanyPos(null);
      } catch (e) {
        console.warn('No se pudo cargar coordenadas de la empresa', e);
        setCompanyPos(null);
      }
    };
    loadCompany();
  }, [tenantUuid]);

  useEffect(() => {
    const load = async () => {
      if (!tenantUuid) return;
      setLoading(true);
      try {
        const r = await listDriverRoutesSB(tenantUuid, today);
        setRoutes(r);
        if (r.length && !selectedRouteId) setSelectedRouteId(r[0].id);
      } catch (e) {
        console.error('listDriverRoutesSB error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantUuid, today]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!tenantUuid || !selectedRouteId) { setDetail(null); return; }
      try {
        const d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
        setDetail(d);
      } catch (e) {
        console.error('driver_route_with_stops error', e);
      }
    };
    loadDetail();
  }, [tenantUuid, selectedRouteId]);

  // Stops to show to the driver: exclude those that match company location
  const visibleStops = useMemo(() => {
    const raw: any[] = (detail?.stops || [])
      .filter((s: any) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
      .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
    if (!companyPos) return raw;
    return raw.filter((s: any) => !isSamePoint({ lat: Number(s.lat), lng: Number(s.lng) }, companyPos));
  }, [detail, companyPos]);

  const firstPendingStopId = useMemo(() => {
    const pending = (visibleStops as any[]).find((s) => s.status === 'pending');
    return pending?.id ?? null;
  }, [visibleStops]);

  const handleStart = async () => {
    if (!tenantUuid || !selectedRouteId) return;
    await startRouteSB(tenantUuid, selectedRouteId);
    // Recargar detalle
    let d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
    // Si la primera parada coincide con la empresa, márcala como completada
    try {
      if (companyPos && Array.isArray(d?.stops)) {
        const first = [...d.stops]
          .filter((s: any) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
          .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))[0];
        if (first && isSamePoint({ lat: Number(first.lat), lng: Number(first.lng) }, companyPos) && first.status !== 'completed') {
          await completeStopSB(tenantUuid, first.id);
          d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
        }
      }
    } catch (e) {
      console.warn('No se pudo autocompletar la parada inicial cercana a la empresa', e);
    }
    setDetail(d);
  };

  const handleArrive = async () => {
    if (!tenantUuid || !firstPendingStopId) return;
    await arriveStopSB(tenantUuid, firstPendingStopId);
    if (selectedRouteId) {
      const d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
      setDetail(d);
    }
  };

  const handleComplete = async () => {
    if (!tenantUuid || !firstPendingStopId) return;
    await completeStopSB(tenantUuid, firstPendingStopId);
    if (selectedRouteId) {
      const d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
      setDetail(d);
    }
  };

  const handleFinish = async () => {
    if (!tenantUuid || !selectedRouteId) return;
    await finishRouteSB(tenantUuid, selectedRouteId);
    const d = await getDriverRouteWithStopsSB(tenantUuid, selectedRouteId);
    setDetail(d);
  };

  // Inicializar mapa y geolocalización cuando la ruta esté en progreso
  useEffect(() => {
    const setupMap = async () => {
      if (!detail?.route || detail?.route?.status !== 'in_progress') return;
      if (!mapDivRef.current) return;
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
      const lang = (import.meta.env.VITE_GOOGLE_MAPS_LANG as string | undefined) || 'es';
      const region = (import.meta.env.VITE_GOOGLE_MAPS_REGION as string | undefined) || 'ES';
      if (!key) return;
      const g = await getGoogle(key, lang, region);

      // Construir path con paradas válidas ordenadas por sequence
      let stops: any[] = (detail?.stops || [])
        .filter((s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
      // Excluir paradas que coincidan con la ubicación de la empresa (no se cuentan)
      if (companyPos) {
        stops = stops.filter((s: any) => !isSamePoint({ lat: Number(s.lat), lng: Number(s.lng) }, companyPos));
      }
      const path = stops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }));

      // Crear/actualizar mapa
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: path[0] || { lat: 40.4168, lng: -3.7038 },
          zoom: path.length ? 13 : 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      }

      // Limpiar render previo para evitar líneas rectas superpuestas
      if (directionsPolylinesRef.current.length) {
        directionsPolylinesRef.current.forEach((pl) => pl.setMap(null));
        directionsPolylinesRef.current = [];
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      // Limpiar marcadores de paradas anteriores
      stopMarkersRef.current.forEach((m) => m.setMap(null));
      stopMarkersRef.current = [];

      // Intentar trazar por calles por tramos con Directions API
      const drawWithDirections = async () => {
        if (!path.length) return false;
        try {
          if (!directionsServiceRef.current) directionsServiceRef.current = new g.maps.DirectionsService();

          // Construir secuencia de puntos: empresa (si existe) + paradas + empresa (si existe)
          const seq: { lat: number; lng: number }[] = companyPos ? [companyPos, ...path, companyPos] : path;
          // Pedir direcciones tramo a tramo
          for (let i = 0; i < seq.length - 1; i++) {
            const origin = seq[i];
            const destination = seq[i + 1];
            const res = await directionsServiceRef.current.route({
              origin,
              destination,
              travelMode: g.maps.TravelMode.DRIVING,
              optimizeWaypoints: false,
              provideRouteAlternatives: false,
            });
            const route = res.routes?.[0];
            if (route && route.overview_path?.length) {
              const pl = new g.maps.Polyline({
                path: route.overview_path,
                geodesic: true,
                strokeColor: '#10b981',
                strokeOpacity: 0.95,
                strokeWeight: 5,
              });
              pl.setMap(mapRef.current);
              directionsPolylinesRef.current.push(pl);
            }
          }

          // Marcadores numerados de paradas 1..N (empresa no cuenta)
          stops.forEach((s: any, idx: number) => {
            const pos = { lat: Number(s.lat), lng: Number(s.lng) };
            const marker = new g.maps.Marker({ position: pos, map: mapRef.current, label: `${idx + 1}` });
            stopMarkersRef.current.push(marker);
          });
          // Marcador único de empresa con etiqueta "0"
          if (companyPos) {
            const companyMarker = new g.maps.Marker({ position: companyPos, map: mapRef.current, label: '0' });
            stopMarkersRef.current.push(companyMarker);
          }

          return true;
        } catch (err) {
          console.warn('Directions API (por tramos) falló, uso polilínea simple', err);
          return false;
        }
      };

      const ok = await drawWithDirections();

      // Fallback: polilínea directa si Directions falla
      if (!ok) {
        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
        }
        if (path.length) {
          // Fallback: incluir empresa en el trazado visual si existe
          const polyPath = companyPos ? [companyPos, ...path, companyPos] : path;
          routePolylineRef.current = new g.maps.Polyline({
            path: polyPath,
            geodesic: true,
            strokeColor: '#10b981',
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          routePolylineRef.current.setMap(mapRef.current);
          const bounds = new g.maps.LatLngBounds();
          // Ajustar bounds incluyendo empresa si existe
          if (companyPos) bounds.extend(companyPos as any);
          path.forEach((p: any) => bounds.extend(p));
          mapRef.current.fitBounds(bounds);
          // Marcadores simples 1..N
          stops.forEach((s: any, idx: number) => {
            const pos = { lat: Number(s.lat), lng: Number(s.lng) };
            const marker = new g.maps.Marker({ position: pos, map: mapRef.current, label: `${idx + 1}` });
            stopMarkersRef.current.push(marker);
          });
          // Marcador empresa "0"
          if (companyPos) {
            const companyMarker = new g.maps.Marker({ position: companyPos, map: mapRef.current, label: '0' });
            stopMarkersRef.current.push(companyMarker);
          }
        }
      }

      // Iniciar geolocalización
      if (navigator.geolocation) {
        if (geoWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(geoWatchIdRef.current);
          geoWatchIdRef.current = null;
        }
        geoWatchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!driverMarkerRef.current) {
              driverMarkerRef.current = new g.maps.Marker({
                position: coords,
                map: mapRef.current,
                title: 'Mi ubicación',
                icon: {
                  path: g.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
              });
              // Centrar una vez al iniciar
              mapRef.current.setCenter(coords);
            } else {
              driverMarkerRef.current.setPosition(coords);
            }
          },
          (err) => {
            console.warn('Geolocation error', err);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      }
    };

    setupMap();

    // Limpieza cuando cambia el estado o desmonta
    return () => {
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (directionsPolylinesRef.current.length) {
        directionsPolylinesRef.current.forEach((pl) => pl.setMap(null));
        directionsPolylinesRef.current = [];
      }
      stopMarkersRef.current.forEach((m) => m.setMap(null));
      stopMarkersRef.current = [];
      // No destruimos el mapa para reusar el contenedor
    };
  }, [detail?.route?.status, companyPos, selectedRouteId]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mis rutas</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">{today}</div>
        </div>

        {loading && <div className="text-slate-600 dark:text-slate-300">Cargando...</div>}

        {!loading && routes.length === 0 && (
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            No tienes rutas asignadas para hoy.
          </div>
        )}

        {routes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedRouteId === r.id
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 dark:text-white">{r.name || 'Ruta'}</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusStyle(r.status)}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {r.total_stops} paradas · {r.completed_stops} completadas
                  </div>
                </button>
              ))}
            </div>

            <div className="md:col-span-2">
              {detail ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={handleStart} className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50" disabled={detail?.route?.status === 'in_progress' || detail?.route?.status === 'completed'}>
                      Iniciar ruta
                    </button>
                    <button onClick={handleArrive} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!firstPendingStopId}>
                      Llegada al siguiente
                    </button>
                    <button onClick={handleComplete} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={!firstPendingStopId}>
                      Completar siguiente
                    </button>
                    <button onClick={handleFinish} className="px-3 py-2 rounded bg-slate-800 text-white disabled:opacity-50" disabled={detail?.route?.status !== 'in_progress'}>
                      Finalizar ruta
                    </button>
                  </div>

                  {detail?.route?.status === 'in_progress' && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div ref={mapDivRef} style={{ width: '100%', height: 360 }} />
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                    {visibleStops.map((s: any, idx: number) => (
                      <div key={s.id} className="p-4 flex items-center justify-between bg-white dark:bg-slate-900">
                        <div>
                          <div className="text-sm text-slate-500">#{idx + 1}</div>
                          <div className="font-medium text-slate-900 dark:text-white">{s.address || s.id}</div>
                          <div className="text-xs text-slate-500">{s.status}</div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.arrived_at ? `Llegada: ${new Date(s.arrived_at).toLocaleTimeString()}` : ''}
                          {s.completed_at ? ` · Fin: ${new Date(s.completed_at).toLocaleTimeString()}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Selecciona una ruta para ver el detalle.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Driver;
