import { z } from "zod";

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "NEFT",
  "Cheque",
  "Bank Transfer",
  "PhonePe/GPay",
] as const;

const money = z.coerce
  .number()
  .min(0, "Price negative nahi ho sakta.")
  .max(10_000_000, "Price bahut bada hai.");

const optionalId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number()
    .int()
    .positive("Chuna hua option sahi nahi hai.")
    .optional(),
);

function parseJsonArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const saleItemSchema = z.object({
  /** 0 keeps legacy free-text lines that have no catalog product id. */
  productId: z.coerce.number().int().min(0),
  qty: z.coerce
    .number()
    .int("Quantity poori honi chahiye.")
    .min(1, "Quantity 1 se kam nahi ho sakti.")
    .max(100_000),
  price: money,
});

export const saleInputSchema = z.object({
  clientId: z.coerce.number().int().positive("Client chunna zaroori hai."),
  mechanicId: optionalId,
  paymentMode: z.enum(PAYMENT_MODES, "Payment mode sahi nahi hai."),
  remarks: z.string().trim().max(300, "Remarks bahut lambe hain.").optional(),
  items: z.preprocess(
    parseJsonArray,
    z
      .array(saleItemSchema)
      .min(1, "Kam se kam ek product add karein.")
      .max(50, "50 se zyada items nahi."),
  ),
});

export type SaleInput = z.infer<typeof saleInputSchema>;

export function saleInputFromForm(formData: FormData) {
  return saleInputSchema.safeParse({
    clientId: formData.get("client_id") ?? "",
    mechanicId: formData.get("mechanic_id") ?? "",
    paymentMode: formData.get("payment_mode") ?? "",
    remarks: formData.get("remarks") ?? "",
    items: formData.get("items") ?? "[]",
  });
}
