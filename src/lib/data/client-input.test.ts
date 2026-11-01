import { describe, expect, it } from "vitest";

import { clientInputSchema } from "./client-input";

const base = {
  firstname: "Vikram",
  middlename: "",
  lastname: "Jain",
  contact: "98765 43210",
  email: "",
  address: "Katni",
  openingBalance: "0",
  paymentDueDate: "",
  paymentDueRemarks: "",
};

describe("client input schema", () => {
  it("accepts a minimal valid client and coerces the balance", () => {
    const parsed = clientInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.openingBalance).toBe(0);
      expect(parsed.data.email).toBe("");
    }
  });

  it("rejects missing names, bad emails and invalid dates", () => {
    expect(
      clientInputSchema.safeParse({ ...base, firstname: " " }).success,
    ).toBe(false);
    expect(
      clientInputSchema.safeParse({ ...base, email: "not-mail" }).success,
    ).toBe(false);
    expect(
      clientInputSchema.safeParse({ ...base, paymentDueDate: "01-02-2026" })
        .success,
    ).toBe(false);
  });

  it("accepts a valid email and ISO date", () => {
    const parsed = clientInputSchema.safeParse({
      ...base,
      email: "vikram@example.com",
      paymentDueDate: "2026-11-15",
    });
    expect(parsed.success).toBe(true);
  });
});
