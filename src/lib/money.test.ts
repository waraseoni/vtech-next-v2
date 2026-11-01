import { describe, expect, it } from "vitest";

import {
  formatINR,
  formatINRCompact,
  lineTotal,
  roundMoney,
  sumMoney,
  toNumber,
} from "./money";

describe("money", () => {
  it("coerces numeric strings and rejects junk", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });

  it("rounds to paise without float drift", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(lineTotal(3, 99.955)).toBe(299.87);
  });

  it("sums nullable values", () => {
    expect(sumMoney([10, "2.5", null, undefined])).toBe(12.5);
  });

  it("formats INR", () => {
    expect(formatINR(1234.5)).toContain("1,234.50");
    expect(formatINR(null)).toContain("0.00");
  });

  it("formats compact INR for tiles and charts", () => {
    expect(formatINRCompact(0)).toContain("0");
    expect(formatINRCompact(348970)).toContain("L");
    expect(formatINRCompact("not-a-number")).toContain("0");
  });
});
