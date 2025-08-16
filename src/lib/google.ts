// Lightweight loader for Google Maps JavaScript API with Places library
export function loadGoogleMaps(apiKey: string, language = 'es', region = 'ES', libraries: string[] = ['places']) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window not available'));
  const w = window as any;
  if (w.google && w.google.maps) return Promise.resolve(w.google as any);
  if (w.__googleMapsLoading) return w.__googleMapsLoading as Promise<any>;
  const params = new URLSearchParams({ key: apiKey, language, region, libraries: libraries.join(',') });
  const url = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
  w.__googleMapsLoading = new Promise<any>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(w.google as any);
    script.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
    document.head.appendChild(script);
  });
  return w.__googleMapsLoading as Promise<any>;
}

export async function getGoogle(apiKey: string, language = 'es', region = 'ES') {
  const w = window as any;
  if (w.google && w.google.maps) return w.google as any;
  return loadGoogleMaps(apiKey, language, region);
}
