import { describe, expect, it } from "vitest";

import { saleInputFromForm } from "./sale-input";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const base = {
  client_id: "7",
  payment_mode: "UPI",
  remarks: "Counter sale",
  items: JSON.stringify([{ productId: 3, qty: 2, price: 450.5 }]),
};

describe("sale input", () => {
  it("parses a valid sale", () => {
    const parsed = saleInputFromForm(form(base));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.clientId).toBe(7);
    expect(parsed.data.paymentMode).toBe("UPI");
    expect(parsed.data.items[0]?.qty).toBe(2);
  });

  it("rejects empty items, bad mode and missing client", () => {
    expect(saleInputFromForm(form({ ...base, items: "[]" })).success).toBe(
      false,
    );
    expect(
      saleInputFromForm(form({ ...base, payment_mode: "Crypto" })).success,
    ).toBe(false);
    expect(saleInputFromForm(form({ ...base, client_id: "0" })).success).toBe(
      false,
    );
  });

  it("allows an optional mechanic", () => {
    const parsed = saleInputFromForm(form({ ...base, mechanic_id: "11" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.mechanicId).toBe(11);
  });

  it("allows free-text lines but rejects fractional qty (RPC casts int)", () => {
    const freeText = saleInputFromForm(
      form({
        ...base,
        items: JSON.stringify([{ productId: 0, qty: 2, price: 100 }]),
      }),
    );
    expect(freeText.success).toBe(true);

    const fractional = saleInputFromForm(
      form({
        ...base,
        items: JSON.stringify([{ productId: 3, qty: 1.5, price: 100 }]),
      }),
    );
    expect(fractional.success).toBe(false);
  });
});
