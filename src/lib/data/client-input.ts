import { z } from "zod";

export const clientInputSchema = z.object({
  firstname: z
    .string()
    .trim()
    .min(1, "First name zaroori hai.")
    .max(80, "First name bahut lamba hai."),
  middlename: z.string().trim().max(80).optional(),
  lastname: z
    .string()
    .trim()
    .min(1, "Last name zaroori hai.")
    .max(80, "Last name bahut lamba hai."),
  contact: z
    .string()
    .trim()
    .min(3, "Contact number zaroori hai.")
    .max(100, "Contact number bahut lamba hai.")
    .regex(
      /^[0-9+\-().\s]+$/,
      "Contact me sirf digits, space, + - ( ) allowed.",
    ),
  email: z.union([z.literal(""), z.email("Email sahi nahi hai.")]).optional(),
  address: z
    .string()
    .trim()
    .min(1, "Address zaroori hai.")
    .max(400, "Address bahut lamba hai."),
  openingBalance: z.coerce
    .number()
    .min(-100_000_000, "Opening balance bahut bada hai.")
    .max(100_000_000, "Opening balance bahut bada hai."),
  paymentDueDate: z
    .union([z.literal(""), z.iso.date("Due date sahi nahi hai.")])
    .optional(),
  paymentDueRemarks: z.string().trim().max(300).optional(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export function clientInputFromForm(formData: FormData) {
  return clientInputSchema.safeParse({
    firstname: formData.get("firstname") ?? "",
    middlename: formData.get("middlename") ?? "",
    lastname: formData.get("lastname") ?? "",
    contact: formData.get("contact") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    openingBalance: formData.get("opening_balance") || 0,
    paymentDueDate: formData.get("payment_due_date") ?? "",
    paymentDueRemarks: formData.get("payment_due_remarks") ?? "",
  });
}
