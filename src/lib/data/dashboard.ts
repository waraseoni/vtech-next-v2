import "server-only";

import { cache } from "react";

import { getClientNames } from "@/lib/data/clients";
import { unwrap } from "@/lib/data/errors";
import {
  dashboardStatsSchema,
  monthlyRevenueSchema,
  parseJson,
} from "@/lib/data/schemas";
import { istDayRange, todayIST } from "@/lib/date";
import { parseLegacyClientId } from "@/lib/domain/client";
import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  totalJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  finishedJobs: number;
  paidJobs: number;
  cancelledJobs: number;
  deliveredJobs: number;
  totalClients: number;
  totalMechanics: number;
  todayRepair: number;
  todayDirect: number;
};

export type MonthlyRevenuePoint = { month: string; revenue: number };

export type RecentJob = {
  id: number;
  jobId: string | null;
  code: string;
  clientName: string;
  item: string;
  fault: string;
  amount: number;
  status: number;
  dateCreated: string;
};

export type RecentPayment = {
  id: number;
  clientName: string;
  amount: number;
  discount: number;
  paymentMode: string | null;
  paymentDate: string | null;
};

export type AttendanceStripRow = {
  mechanicId: number;
  name: string;
  status: number;
  timeIn: string | null;
  timeOut: string | null;
};

export type DashboardData = {
  stats: DashboardStats;
  monthlyRevenue: MonthlyRevenuePoint[];
  recentJobs: RecentJob[];
  recentPayments: RecentPayment[];
  attendance: AttendanceStripRow[];
};

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const supabase = await createClient();
  const today = todayIST();
  const { start, end } = istDayRange(today);

  const [
    statsRes,
    revenueRes,
    jobsRes,
    paymentsRes,
    attendanceRes,
    mechanicsRes,
  ] = await Promise.all([
    supabase.rpc("get_dashboard_stats", {
      p_today_start: start,
      p_today_end: end,
    }),
    supabase.rpc("get_monthly_revenue", { p_months: 12 }),
    supabase
      .from("transaction_list")
      .select(
        "id, job_id, code, client_name, item, fault, amount, status, date_created",
      )
      .eq("del_status", 0)
      .order("date_created", { ascending: false })
      .limit(8),
    supabase
      .from("client_payments")
      .select("id, client_id, amount, discount, payment_mode, payment_date")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("attendance_list")
      .select("mechanic_id, status, time_in, time_out")
      .eq("curr_date", today),
    supabase
      .from("mechanic_list")
      .select("id, firstname, lastname")
      .eq("delete_flag", 0)
      .eq("status", 1)
      .order("firstname"),
  ]);

  const stats = parseJson(
    dashboardStatsSchema,
    unwrap(statsRes, "dashboard.stats"),
    "dashboard.stats",
  );
  const monthlyRevenue = parseJson(
    monthlyRevenueSchema,
    unwrap(revenueRes, "dashboard.revenue"),
    "dashboard.revenue",
  );

  const jobRows = unwrap(jobsRes, "dashboard.jobs");
  const paymentRows = unwrap(paymentsRes, "dashboard.payments");
  const mechanicRows = unwrap(mechanicsRes, "dashboard.mechanics");
  const attendanceRows = unwrap(attendanceRes, "dashboard.attendance");

  const clientIds = [
    ...jobRows.map((row) => parseLegacyClientId(row.client_name)),
    ...paymentRows.map((row) => row.client_id),
  ].filter((id): id is number => id !== null);

  const clientNames = await getClientNames(clientIds);
  const mechanicNames = new Map(
    mechanicRows.map((row) => [
      row.id,
      `${row.firstname} ${row.lastname}`.trim(),
    ]),
  );
  const attendanceByMechanic = new Map(
    attendanceRows.map((row) => [row.mechanic_id, row]),
  );

  return {
    stats,
    monthlyRevenue,
    recentJobs: jobRows.map((row) => {
      const clientId = parseLegacyClientId(row.client_name);
      return {
        id: row.id,
        jobId: row.job_id,
        code: row.code,
        clientName:
          clientNames.get(clientId ?? -1) ??
          (clientId ? `Client #${clientId}` : "Walk-in"),
        item: row.item,
        fault: row.fault,
        amount: row.amount,
        status: row.status,
        dateCreated: row.date_created,
      };
    }),
    recentPayments: paymentRows.map((row) => ({
      id: row.id,
      clientName: clientNames.get(row.client_id) ?? `Client #${row.client_id}`,
      amount: row.amount,
      discount: row.discount ?? 0,
      paymentMode: row.payment_mode,
      paymentDate: row.payment_date,
    })),
    attendance: mechanicRows.map((mechanic) => {
      const row = attendanceByMechanic.get(mechanic.id);
      return {
        mechanicId: mechanic.id,
        name: mechanicNames.get(mechanic.id) ?? `#${mechanic.id}`,
        status: row?.status ?? 0,
        timeIn: row?.time_in ?? null,
        timeOut: row?.time_out ?? null,
      };
    }),
  };
});
