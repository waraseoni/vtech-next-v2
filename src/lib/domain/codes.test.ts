import { describe, expect, it } from "vitest";

import {
  formatJobCode,
  formatSaleCode,
  nextJobCodeSequence,
  nextSaleCodeSequence,
  parseSaleCodeSequence,
} from "./codes";

describe("job code", () => {
  it("uses the IST date prefix and a two-digit sequence", () => {
    expect(formatJobCode("2026-11-01", 4)).toBe("2026110104");
    expect(formatJobCode("2026-11-01", 123)).toBe("20261101123");
  });

  it("continues only the requested day's sequence", () => {
    expect(
      nextJobCodeSequence("2026-11-01", [
        "2026110101",
        "2026110107",
        "2026103199",
        "legacy",
        null,
      ]),
    ).toBe(8);
    expect(nextJobCodeSequence("2026-11-02", [])).toBe(1);
  });
});

describe("sale code", () => {
  it("pads to six digits", () => {
    expect(formatSaleCode(1)).toBe("SALE000001");
    expect(formatSaleCode(42)).toBe("SALE000042");
  });

  it("finds the next sequence and parses existing codes", () => {
    expect(nextSaleCodeSequence(["SALE000001", "SALE000041", "X"])).toBe(42);
    expect(parseSaleCodeSequence("SALE000041")).toBe(41);
    expect(parseSaleCodeSequence("legacy")).toBeNull();
  });
});
