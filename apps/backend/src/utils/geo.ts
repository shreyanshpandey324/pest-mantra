export interface GeoPoint { latitude: number; longitude: number; }

function toRadians(value: number): number { return (value * Math.PI) / 180; }

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

/**
 * Lightweight route estimate for decision support when a paid routing API is
 * not configured. It intentionally labels itself as an estimate: road distance
 * is approximated from straight-line distance and ETA assumes typical urban
 * field-service speed.
 */
export function estimateUrbanRoute(straightLineKm: number): { roadKm: number; etaMinutes: number } {
  const roadKm = Math.max(0, straightLineKm) * 1.22;
  const etaMinutes = Math.max(4, Math.round((roadKm / 24) * 60));
  return { roadKm, etaMinutes };
}
