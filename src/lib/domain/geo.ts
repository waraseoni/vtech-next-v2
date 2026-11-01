export type Geofence = {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  radiusM: number;
};

export type LatLng = { lat: number; lng: number };

export const DEFAULT_GEOFENCE_RADIUS_M = 200;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const radius = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.asin(Math.min(1, Math.sqrt(h))));
}

function parseCoord(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGeofence(meta: Record<string, string>): Geofence {
  const enabled = /^(1|true|yes|on)$/i.test(meta.geofence_enabled ?? "");
  const lat = parseCoord(meta.geofence_lat);
  const lng = parseCoord(meta.geofence_lng);
  const radiusRaw = Number(meta.geofence_radius_m);
  const radiusM = Number.isFinite(radiusRaw)
    ? Math.min(5_000, Math.max(20, Math.round(radiusRaw)))
    : DEFAULT_GEOFENCE_RADIUS_M;
  return { enabled, lat, lng, radiusM };
}

export type GeofenceResult =
  | { ok: true; distanceM: number | null }
  | { ok: false; distanceM: number; message: string };

/**
 * Disabled geofence or missing config allows the punch (fail-open to avoid
 * locking staff out of the shared live shop). A bad browser location is still
 * rejected when the geofence is enabled.
 */
export function evaluateGeofence(
  fence: Geofence,
  point: LatLng | null,
): GeofenceResult {
  if (!fence.enabled || fence.lat === null || fence.lng === null) {
    return { ok: true, distanceM: null };
  }
  if (!point) {
    return {
      ok: false,
      distanceM: 0,
      message:
        "Location nahi mili. Location permission allow karke retry karein.",
    };
  }
  const distanceM = haversineMeters({ lat: fence.lat, lng: fence.lng }, point);
  if (distanceM > fence.radiusM) {
    return {
      ok: false,
      distanceM,
      message: `Aap shop se ${distanceM} m door hain (allowed ${fence.radiusM} m).`,
    };
  }
  return { ok: true, distanceM };
}
