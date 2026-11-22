import { describe, expect, it } from "vitest";

import {
  composeJobItemLabel,
  hasStructuredDevice,
  JOB_ITEM_MAX_LENGTH,
  wouldShrinkLegacyItem,
} from "./job-item-label";

describe("composeJobItemLabel", () => {
  it("keeps legacy free text untouched when no structured field is set", () => {
    expect(composeJobItemLabel({}, "Activa 6G scooter")).toBe(
      "Activa 6G scooter",
    );
    expect(composeJobItemLabel({ brand: "  " }, "Old item")).toBe("Old item");
    expect(hasStructuredDevice({ model: null })).toBe(false);
  });

  it("composes brand, category and model in order", () => {
    expect(
      composeJobItemLabel(
        { brand: "Komaki", category: "Scooter", model: "XGT" },
        "old text",
      ),
    ).toBe("Komaki Scooter XGT");
  });

  it("skips missing middle fields instead of leaving gaps", () => {
    expect(composeJobItemLabel({ brand: "Komaki", model: "XGT" })).toBe(
      "Komaki XGT",
    );
  });

  it("respects the 200-char item schema limit", () => {
    const longBrand = "B".repeat(JOB_ITEM_MAX_LENGTH + 20);
    expect(composeJobItemLabel({ brand: longBrand })).toHaveLength(
      JOB_ITEM_MAX_LENGTH,
    );
  });

  it("warns before hiding a longer legacy value", () => {
    const composed = composeJobItemLabel(
      { brand: "KMK" },
      "Komaki XGT scooter full description",
    );
    expect(
      wouldShrinkLegacyItem(composed, "Komaki XGT scooter full description"),
    ).toBe(true);
    expect(wouldShrinkLegacyItem("Komaki XGT", "KMK")).toBe(false);
  });
});
