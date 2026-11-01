import { describe, expect, it } from "vitest";

import { evaluateGeofence, haversineMeters, parseGeofence } from "./geo";

describe("geofence", () => {
  it("measures a known one-degree latitude distance", () => {
    expect(
      haversineMeters({ lat: 21.15, lng: 79.08 }, { lat: 21.151, lng: 79.08 }),
    ).toBeGreaterThan(100);
    expect(
      haversineMeters({ lat: 21.15, lng: 79.08 }, { lat: 21.15, lng: 79.08 }),
    ).toBe(0);
  });

  it("parses settings and clamps the radius", () => {
    expect(
      parseGeofence({
        geofence_enabled: "1",
        geofence_lat: "21.15",
        geofence_lng: "79.08",
        geofence_radius_m: "9000",
      }),
    ).toEqual({ enabled: true, lat: 21.15, lng: 79.08, radiusM: 5000 });
    expect(parseGeofence({}).enabled).toBe(false);
  });

  it("allows when disabled or unconfigured, rejects far points", () => {
    const disabled = parseGeofence({});
    expect(evaluateGeofence(disabled, null).ok).toBe(true);

    const fence = {
      enabled: true,
      lat: 21.15,
      lng: 79.08,
      radiusM: 200,
    };
    expect(evaluateGeofence(fence, { lat: 21.1505, lng: 79.0805 }).ok).toBe(
      true,
    );
    expect(evaluateGeofence(fence, { lat: 21.2, lng: 79.08 }).ok).toBe(false);
    expect(evaluateGeofence(fence, null).ok).toBe(false);
  });
});
