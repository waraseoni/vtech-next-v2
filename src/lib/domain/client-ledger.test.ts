import { describe, expect, it } from "vitest";

import { buildLedger, type LedgerSource } from "./client-ledger";

const source: LedgerSource = {
  openingBalance: 500,
  jobs: [
    {
      id: 1,
      job_id: "101",
      code: "J101",
      item: "AC service",
      amount: 1_000,
      status: 5,
      date_created: "2026-10-01T10:00:00+05:30",
    },
  ],
  sales: [
    {
      id: 2,
      sale_code: "SALE-1",
      total_amount: 300,
      remarks: "Filter",
      date_created: "2026-10-05T10:00:00+05:30",
    },
  ],
  loans: [
    {
      id: 3,
      principal_amount: 2_000,
      loan_date: "2026-10-10",
      remarks: "Loan",
    },
  ],
  payments: [
    {
      id: 4,
      payment_date: "2026-10-12",
      amount: 500,
      discount: 50,
      payment_mode: "Cash",
      payment_type: "Partial",
      job_id: null,
      bill_no: null,
      loan_id: null,
      remarks: null,
    },
    {
      id: 5,
      payment_date: "2026-10-20",
      amount: 200,
      discount: 0,
      payment_mode: "UPI",
      payment_type: "Partial",
      job_id: null,
      bill_no: null,
      loan_id: 3,
      remarks: "EMI",
    },
  ],
};

describe("buildLedger", () => {
  it("nets debits against payment amount + discount", () => {
    const statement = buildLedger(source);
    expect(statement.rows).toHaveLength(6);
    expect(statement.totals).toEqual({
      debit: 3_800,
      credit: 750,
      closing: 3_050,
    });
    expect(statement.rows.at(-1)?.balance).toBe(3_050);
  });

  it("computes brought forward for a date range", () => {
    const statement = buildLedger(source, { from: "2026-10-10" });
    expect(statement.broughtForward).toBe(1_800);
    expect(statement.rows.map((row) => row.key)).toEqual([
      "loan-3",
      "payment-4",
      "payment-5",
    ]);
    expect(statement.totals.closing).toBe(3_050);
  });

  it("filters by entry type after computing the running balance", () => {
    const statement = buildLedger(source, { filter: "payments" });
    expect(statement.rows).toHaveLength(2);
    expect(statement.totals.debit).toBe(0);
    expect(statement.totals.credit).toBe(750);
  });
});
