import { z } from "zod";

import { DataError } from "@/lib/data/errors";
import type { Json } from "@/lib/supabase/database.types";

const num = z.coerce.number();
const nullableDate = z.string().nullable().optional();

export const dashboardStatsSchema = z.object({
  totalJobs: num,
  pendingJobs: num,
  inProgressJobs: num,
  finishedJobs: num,
  paidJobs: num,
  cancelledJobs: num,
  deliveredJobs: num,
  totalClients: num,
  totalMechanics: num,
  todayRepair: num,
  todayDirect: num,
});

export const monthlyRevenueSchema = z.array(
  z.object({ month: z.string(), revenue: num }),
);

export const clientFinancialsSchema = z.array(
  z.object({
    client_id: num,
    repair_billed: num,
    repair_done: num,
    direct_sales_billed: num,
    service_paid: num,
    active_loan_given: num,
    loan_repaid: num,
    last_txn_date: nullableDate,
  }),
);

export const financialSummarySchema = z.object({
  totalSales: num,
  partsCost: num,
  grossProfit: num,
  discounts: num,
  salary: num,
  loanPaid: num,
  expenses: num,
  totalOutflow: num,
  netProfit: num,
});

export function parseJson<T>(
  schema: z.ZodType<T>,
  value: Json,
  operation: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new DataError(
      operation,
      parsed.error.issues[0]?.message ?? "unexpected payload",
    );
  }
  return parsed.data;
}
