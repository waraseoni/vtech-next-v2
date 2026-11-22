import { describe, expect, it } from "vitest";

import {
  activeLoanSummary,
  computeLoanTerms,
  loanBalance,
  loanRepaidTotal,
} from "./client-loan";

describe("computeLoanTerms", () => {
  it("uses flat simple interest like v1 give-loan", () => {
    expect(
      computeLoanTerms({ principal: 10_000, annualRate: 12, months: 12 }),
    ).toEqual({ interest: 1_200, totalPayable: 11_200, emi: 933.33 });
  });

  it("guards zero months and negative values", () => {
    expect(
      computeLoanTerms({ principal: -5, annualRate: -2, months: 0 }),
    ).toEqual({
      interest: 0,
      totalPayable: 0,
      emi: 0,
    });
  });
});

describe("loan balances", () => {
  const repayments = [
    { loanId: 1, amount: 900, discount: 33.33 },
    { loanId: 1, amount: 100, discount: 0 },
    { loanId: 2, amount: 500, discount: 0 },
  ];

  it("counts amount + discount per loan", () => {
    expect(loanRepaidTotal(1, repayments)).toBe(1_033.33);
    expect(loanBalance(1_200, 1_400)).toBe(0);
  });

  it("summarises active loans only", () => {
    expect(
      activeLoanSummary(
        [
          { id: 1, principalAmount: 1_000, totalPayable: 1_200, status: 1 },
          { id: 2, principalAmount: 500, totalPayable: 500, status: 0 },
        ],
        repayments,
      ),
    ).toEqual({
      activeCount: 1,
      principal: 1_000,
      totalPayable: 1_200,
      repaid: 1_033.33,
      balance: 166.67,
    });
  });
});
