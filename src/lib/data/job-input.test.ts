import { describe, expect, it } from "vitest";

import { jobInputFromForm, jobInputSchema } from "./job-input";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const base = {
  client_id: "42",
  item: "Samsung fridge",
  fault: "Cooling nahi kar raha",
  services: JSON.stringify([{ serviceId: 1, name: "Checkup", price: 300 }]),
  products: JSON.stringify([
    { productId: 9, name: "Thermostat", qty: 1, price: 850 },
  ]),
};

describe("job input", () => {
  it("parses form values and JSON line items", () => {
    const parsed = jobInputFromForm(form(base));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.clientId).toBe(42);
    expect(parsed.data.mechanicId).toBeUndefined();
    expect(parsed.data.services[0]?.price).toBe(300);
    expect(parsed.data.products[0]?.qty).toBe(1);
  });

  it("rejects a missing client and malformed line items", () => {
    expect(jobInputFromForm(form({ ...base, client_id: "" })).success).toBe(
      false,
    );
    expect(
      jobInputFromForm(form({ ...base, services: "not-json" })).success,
    ).toBe(false);
    expect(jobInputFromForm(form({ ...base, item: "" })).success).toBe(false);
  });

  it("accepts optional mechanic and location ids", () => {
    const parsed = jobInputSchema.safeParse({
      clientId: 1,
      mechanicId: 7,
      item: "AC",
      fault: "Noise",
      commissionAmount: 120.5,
      services: [],
      products: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mechanicId).toBe(7);
      expect(parsed.data.commissionAmount).toBe(120.5);
    }
  });
});
