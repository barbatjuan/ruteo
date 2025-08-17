import React, { createContext, useContext, useMemo, useState } from 'react';

export type Stop = { id: string; address: string; lat: number; lng: number; label?: string };
export type RouteInfo = { distance_km: number; duration_min: number } | null;
export type Point = { address: string; lat: number; lng: number };

type RouteContextType = {
  stops: Stop[];
  addStop: (s: Omit<Stop, 'id'>) => void;
  removeStop: (id: string) => void;
  clearStops: () => void;
  setStops: (stops: Stop[]) => void;
  routeInfo: RouteInfo;
  setRouteInfo: (info: RouteInfo) => void;
  origin: Point | null;
  setOrigin: (p: Point | null) => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  optimizeWaypoints: boolean;
  setOptimizeWaypoints: (v: boolean) => void;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

function uid() { return Math.random().toString(36).slice(2); }

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [roundTrip, setRoundTrip] = useState<boolean>(false);
  const [optimizeWaypoints, setOptimizeWaypoints] = useState<boolean>(true);

  const addStop = (s: Omit<Stop, 'id'>) => setStopsState((prev) => [...prev, { id: uid(), ...s }]);
  const removeStop = (id: string) => setStopsState((prev) => prev.filter((x) => x.id !== id));
  const clearStops = () => setStopsState([]);
  const setStops = (s: Stop[]) => setStopsState(s);

  const value = useMemo(() => ({ stops, addStop, removeStop, clearStops, setStops, routeInfo, setRouteInfo, origin, setOrigin, roundTrip, setRoundTrip, optimizeWaypoints, setOptimizeWaypoints }), [stops, routeInfo, origin, roundTrip, optimizeWaypoints]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

export const useRoute = () => {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
};
