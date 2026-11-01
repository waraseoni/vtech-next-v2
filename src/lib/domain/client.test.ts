import { describe, expect, it } from "vitest";

import {
  clientDisplayName,
  clientInitials,
  computeClientBalance,
  parseLegacyClientId,
  phoneDigits,
  resolveClientPhotoUrl,
  telHref,
  whatsAppHref,
} from "./client";

describe("client name", () => {
  it("joins available name parts", () => {
    expect(
      clientDisplayName({
        firstname: "Ravi",
        middlename: null,
        lastname: "Sharma",
      }),
    ).toBe("Ravi Sharma");
    expect(
      clientDisplayName({
        firstname: " Ravi ",
        middlename: "",
        lastname: "Sharma",
      }),
    ).toBe("Ravi Sharma");
  });

  it("parses legacy numeric ids and rejects names", () => {
    expect(parseLegacyClientId("42")).toBe(42);
    expect(parseLegacyClientId(" 42 ")).toBe(42);
    expect(parseLegacyClientId("Ravi")).toBeNull();
    expect(parseLegacyClientId(null)).toBeNull();
  });
});

describe("client balance", () => {
  it("adds opening + repair + direct and subtracts payments", () => {
    expect(
      computeClientBalance({
        openingBalance: "100.5",
        repairBilled: 500,
        directSalesBilled: "200.25",
        servicePaid: 300,
      }),
    ).toEqual({ billed: 800.75, paid: 300, due: 500.75 });
  });

  it("supports overpayment (negative due)", () => {
    expect(
      computeClientBalance({
        openingBalance: 0,
        repairBilled: 100,
        directSalesBilled: 0,
        servicePaid: 150,
      }).due,
    ).toBe(-50);
  });
});

describe("client contact helpers", () => {
  it("builds initials and phone links", () => {
    expect(clientInitials("Vikram Jain")).toBe("VJ");
    expect(clientInitials("  ")).toBe("?");
    expect(phoneDigits("+91 98765-43210")).toBe("919876543210");
    expect(telHref("")).toBeNull();
    expect(telHref("98765 43210")).toBe("tel:9876543210");
  });

  it("builds a wa.me link with a 91 prefix for 10-digit numbers", () => {
    expect(whatsAppHref("98765 43210")).toBe("https://wa.me/919876543210");
    expect(whatsAppHref("+91 98765 43210", "Hi")).toContain(
      "https://wa.me/919876543210?text=Hi",
    );
    expect(whatsAppHref("12345")).toBeNull();
  });

  it("resolves both full URLs and legacy bucket paths", () => {
    const url = "https://example.supabase.co";
    expect(resolveClientPhotoUrl(null, url)).toBeNull();
    expect(resolveClientPhotoUrl("https://cdn.test/a.jpg", url)).toBe(
      "https://cdn.test/a.jpg",
    );
    expect(resolveClientPhotoUrl("3-123.jpeg", url)).toBe(
      "https://example.supabase.co/storage/v1/object/public/client-photos/3-123.jpeg",
    );
    expect(resolveClientPhotoUrl("client-photos/3-123.jpeg", url)).toBe(
      "https://example.supabase.co/storage/v1/object/public/client-photos/3-123.jpeg",
    );
  });
});
