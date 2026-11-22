import { z } from "zod";

import { CONTACT_LABELS } from "@/lib/data/client-contacts";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date YYYY-MM-DD format me ho.");

export const loanInputSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  principal: z.coerce
    .number()
    .positive("Principal 0 se zyada ho.")
    .max(100_000_000, "Principal bahut bada hai."),
  interestRate: z.coerce
    .number()
    .min(0, "Rate negative nahi ho sakta.")
    .max(100, "Rate 100% se zyada nahi ho sakta.")
    .default(0),
  months: z.coerce
    .number()
    .int()
    .min(1, "Kam se kam 1 month.")
    .max(120, "120 months se zyada nahi."),
  loanDate: isoDate,
  remarks: z.string().trim().max(300).optional().default(""),
});

export type LoanInputValues = z.infer<typeof loanInputSchema>;

export function loanInputFromForm(formData: FormData) {
  return loanInputSchema.safeParse({
    clientId: formData.get("client_id"),
    principal: formData.get("principal"),
    interestRate: formData.get("interest_rate") || 0,
    months: formData.get("months"),
    loanDate: formData.get("loan_date"),
    remarks: formData.get("remarks") ?? "",
  });
}

export const contactSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().max(80).optional().default(""),
  label: z.enum(CONTACT_LABELS),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length >= 10 && value.length <= 15, {
      message: "Contact number 10–15 digits ka ho.",
    }),
  isPrimary: z.boolean().default(false),
});

export const contactsSchema = z
  .array(contactSchema)
  .max(10, "10 se zyada contacts nahi.")
  .default([]);

export const dueDateSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  dueDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Due date YYYY-MM-DD format me ho.",
    }),
  remarks: z.string().trim().max(300).optional().default(""),
});

export function contactsFromForm(formData: FormData) {
  const raw = formData.get("contacts");
  if (typeof raw !== "string" || !raw.trim()) return contactsSchema.parse([]);
  try {
    return contactsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new z.ZodError([
      {
        code: "custom",
        message: "Contacts data sahi nahi hai.",
        path: ["contacts"],
      },
    ]);
  }
}
