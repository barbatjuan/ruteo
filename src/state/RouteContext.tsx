import React, { createContext, useContext, useMemo, useState } from 'react';

export type Stop = { id: string; address: string; lat: number; lng: number; label?: string; completed?: boolean };
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
  routeLoading: boolean;
  setRouteLoading: (v: boolean) => void;
  origin: Point | null;
  setOrigin: (p: Point | null) => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  optimizeWaypoints: boolean;
  setOptimizeWaypoints: React.Dispatch<React.SetStateAction<boolean>>;
  // Driver workflow
  inProgress: boolean;
  currentIndex: number | null;
  startRoute: () => void;
  nextStop: () => void;
  completeStop: () => void;
  finishRoute: () => void;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

function uid() { return Math.random().toString(36).slice(2); }

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [roundTrip, setRoundTrip] = useState<boolean>(false);
  const [optimizeWaypoints, setOptimizeWaypoints] = useState<boolean>(true);
  const [inProgress, setInProgress] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const addStop = (s: Omit<Stop, 'id'>) => setStopsState((prev) => [...prev, { id: uid(), completed: false, ...s }]);
  const removeStop = (id: string) => setStopsState((prev) => prev.filter((x) => x.id !== id));
  const clearStops = () => setStopsState([]);
  const setStops = (s: Stop[]) => setStopsState(s);

  // Driver workflow actions
  const startRoute = () => {
    if (!stops.length) return;
    setInProgress(true);
    setCurrentIndex(0);
  };
  const nextStop = () => {
    if (!inProgress || currentIndex === null) return;
    const next = currentIndex + 1;
    if (next >= stops.length) {
      finishRoute();
    } else {
      setCurrentIndex(next);
    }
  };
  const completeStop = () => {
    if (!inProgress || currentIndex === null) return;
    setStopsState((prev) => prev.map((s, i) => (i === currentIndex ? { ...s, completed: true } : s)));
    nextStop();
  };
  const finishRoute = () => {
    setInProgress(false);
    setCurrentIndex(null);
  };

  const value = useMemo(() => ({
    stops,
    addStop,
    removeStop,
    clearStops,
    setStops,
    routeInfo,
    setRouteInfo,
    routeLoading,
    setRouteLoading,
    origin,
    setOrigin,
    roundTrip,
    setRoundTrip,
    optimizeWaypoints,
    setOptimizeWaypoints,
    inProgress,
    currentIndex,
    startRoute,
    nextStop,
    completeStop,
    finishRoute,
  }), [stops, routeInfo, routeLoading, origin, roundTrip, optimizeWaypoints, inProgress, currentIndex]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

export const useRoute = () => {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
};
