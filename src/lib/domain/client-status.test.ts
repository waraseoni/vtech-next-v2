import { describe, expect, it } from "vitest";

import { clientTier, daysSince } from "./client-status";

const today = new Date("2026-11-06T12:00:00+05:30");

describe("clientTier", () => {
  it("flags dues above the high-risk threshold", () => {
    expect(clientTier(20_001, "2026-11-01", today)).toBe("high-risk");
  });

  it("marks any positive due below the threshold as due", () => {
    expect(clientTier(500, "2026-11-01", today)).toBe("due");
  });

  it("keeps recently settled clients clear and old ones in follow-up", () => {
    expect(clientTier(0, "2026-10-20", today)).toBe("clear");
    expect(clientTier(-100, "2026-09-01", today)).toBe("follow-up");
    expect(clientTier(0, null, today)).toBe("clear");
  });
});

describe("daysSince", () => {
  it("counts whole days and clamps future dates", () => {
    expect(daysSince("2026-11-01", today)).toBe(5);
    expect(daysSince("2026-11-10", today)).toBe(0);
    expect(daysSince(null, today)).toBeNull();
  });
});
