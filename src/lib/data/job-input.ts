import { z } from "zod";

const money = z.coerce
  .number()
  .min(0, "Amount negative nahi ho sakta.")
  .max(10_000_000, "Amount bahut bada hai.");

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

export const jobServiceLineSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  price: money,
});

export const jobProductLineSchema = z.object({
  /** 0 keeps legacy free-text lines that have no catalog product id. */
  productId: z.coerce.number().int().min(0),
  name: z.string().trim().min(1).max(200),
  qty: z.coerce
    .number()
    .min(0.01, "Quantity 0 se badi honi chahiye.")
    .max(100_000),
  price: money,
});

export const jobInputSchema = z.object({
  clientId: z.coerce.number().int().positive("Client chunna zaroori hai."),
  mechanicId: optionalId,
  item: z
    .string()
    .trim()
    .min(2, "Item / device likhna zaroori hai.")
    .max(200, "Item bahut lamba hai."),
  fault: z
    .string()
    .trim()
    .min(2, "Fault likhna zaroori hai.")
    .max(400, "Fault bahut lamba hai."),
  remark: z.string().trim().max(400, "Remark bahut lamba hai.").optional(),
  spot: z.string().trim().max(120, "Spot bahut lamba hai.").optional(),
  locationId: optionalId,
  commissionAmount: z.coerce
    .number()
    .min(0, "Commission negative nahi ho sakta.")
    .max(10_000_000, "Commission bahut bada hai."),
  services: z.preprocess(
    parseJsonArray,
    z.array(jobServiceLineSchema).max(50, "50 se zyada services nahi."),
  ),
  products: z.preprocess(
    parseJsonArray,
    z.array(jobProductLineSchema).max(50, "50 se zyada products nahi."),
  ),
});

export type JobInput = z.infer<typeof jobInputSchema>;

export function jobInputFromForm(formData: FormData) {
  return jobInputSchema.safeParse({
    clientId: formData.get("client_id") ?? "",
    mechanicId: formData.get("mechanic_id") ?? "",
    item: formData.get("item") ?? "",
    fault: formData.get("fault") ?? "",
    remark: formData.get("remark") ?? "",
    spot: formData.get("spot") ?? "",
    locationId: formData.get("location_id") ?? "",
    commissionAmount: formData.get("commission_amount") || 0,
    services: formData.get("services") ?? "[]",
    products: formData.get("products") ?? "[]",
  });
}
