import { z } from "zod";

import type { PaymentMode, PaymentType } from "@/lib/supabase/database.types";

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "NEFT",
  "Cheque",
  "Bank Transfer",
  "PhonePe/GPay",
] as const satisfies readonly PaymentMode[];

export const PAYMENT_TYPES = [
  "Full",
  "Partial",
  "Advance",
  "On Account",
] as const satisfies readonly PaymentType[];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date YYYY-MM-DD format me ho.");

export const paymentInputSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  paymentId: z.coerce.number().int().nonnegative().default(0),
  amount: z.coerce
    .number()
    .positive("Amount 0 se zyada ho.")
    .max(100_000_000, "Amount bahut bada hai."),
  discount: z.coerce
    .number()
    .min(0, "Discount negative nahi ho sakta.")
    .max(100_000_000)
    .default(0),
  paymentDate: isoDate,
  paymentMode: z.enum(PAYMENT_MODES),
  paymentType: z.enum(PAYMENT_TYPES),
  jobId: z.string().trim().max(50).optional().default(""),
  billNo: z.string().trim().max(50).optional().default(""),
  loanId: z.coerce.number().int().nonnegative().default(0),
  remarks: z.string().trim().max(300).optional().default(""),
});

export type PaymentInputValues = z.infer<typeof paymentInputSchema>;

export function paymentInputFromForm(formData: FormData) {
  return paymentInputSchema.safeParse({
    clientId: formData.get("client_id"),
    paymentId: formData.get("payment_id") || 0,
    amount: formData.get("amount"),
    discount: formData.get("discount") || 0,
    paymentDate: formData.get("payment_date"),
    paymentMode: formData.get("payment_mode"),
    paymentType: formData.get("payment_type"),
    jobId: formData.get("job_id") ?? "",
    billNo: formData.get("bill_no") ?? "",
    loanId: formData.get("loan_id") || 0,
    remarks: formData.get("remarks") ?? "",
  });
}
