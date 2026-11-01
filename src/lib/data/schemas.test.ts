import { describe, expect, it } from "vitest";

import { DataError } from "./errors";
import {
  clientFinancialsSchema,
  dashboardStatsSchema,
  monthlyRevenueSchema,
  parseJson,
} from "./schemas";

describe("RPC payload schemas", () => {
  it("accepts the live dashboard shape", () => {
    const parsed = parseJson(
      dashboardStatsSchema,
      {
        totalJobs: 13,
        pendingJobs: 5,
        inProgressJobs: 1,
        finishedJobs: 1,
        paidJobs: 0,
        cancelledJobs: 0,
        deliveredJobs: 6,
        totalClients: 12,
        totalMechanics: 2,
        todayRepair: 0,
        todayDirect: 0,
      },
      "test",
    );
    expect(parsed.deliveredJobs).toBe(6);
  });

  it("coerces numeric revenue strings", () => {
    expect(
      parseJson(
        monthlyRevenueSchema,
        [{ month: "Nov 26", revenue: "1250.50" }],
        "test",
      ),
    ).toEqual([{ month: "Nov 26", revenue: 1250.5 }]);
  });

  it("keeps nullable last transaction dates", () => {
    const parsed = parseJson(
      clientFinancialsSchema,
      [
        {
          client_id: 1,
          repair_billed: 0,
          repair_done: 0,
          direct_sales_billed: 0,
          service_paid: 0,
          active_loan_given: 0,
          loan_repaid: 0,
          last_txn_date: null,
        },
      ],
      "test",
    );
    expect(parsed[0].last_txn_date).toBeNull();
  });

  it("throws a DataError on an unexpected payload", () => {
    expect(() =>
      parseJson(dashboardStatsSchema, { totalJobs: 1 }, "test"),
    ).toThrow(DataError);
  });
});
