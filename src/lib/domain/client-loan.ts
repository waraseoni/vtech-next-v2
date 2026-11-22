import { roundMoney } from "@/lib/money";

export type LoanTerms = {
  principal: number;
  annualRate: number;
  months: number;
};

export type LoanAmounts = {
  interest: number;
  totalPayable: number;
  emi: number;
};

/**
 * Flat simple interest, matching v1's per-client "Give loan" flow:
 * total = principal + principal * rate / 100; EMI = total / months.
 * Existing stored rows are displayed as-is; this is only for new/edit forms.
 */
export function computeLoanTerms({
  principal,
  annualRate,
  months,
}: LoanTerms): LoanAmounts {
  const safePrincipal = Math.max(0, principal);
  const safeRate = Math.max(0, annualRate);
  const safeMonths = Math.max(1, Math.floor(months));
  const interest = roundMoney((safePrincipal * safeRate) / 100);
  const totalPayable = roundMoney(safePrincipal + interest);
  const emi = roundMoney(totalPayable / safeMonths);
  return { interest, totalPayable, emi };
}

export type LoanRepayment = {
  loanId: number;
  amount: number;
  discount: number;
};

export function loanRepaidTotal(
  loanId: number,
  repayments: LoanRepayment[],
): number {
  return roundMoney(
    repayments
      .filter((row) => row.loanId === loanId)
      .reduce((sum, row) => sum + row.amount + row.discount, 0),
  );
}

export function loanBalance(totalPayable: number, repaid: number): number {
  return roundMoney(Math.max(0, totalPayable - repaid));
}

export type ActiveLoanSummary = {
  activeCount: number;
  principal: number;
  totalPayable: number;
  repaid: number;
  balance: number;
};

export function activeLoanSummary(
  loans: Array<{
    id: number;
    principalAmount: number;
    totalPayable: number;
    status: number | null;
  }>,
  repayments: LoanRepayment[],
): ActiveLoanSummary {
  const active = loans.filter((loan) => loan.status === 1);
  const totalPayable = roundMoney(
    active.reduce((sum, loan) => sum + loan.totalPayable, 0),
  );
  const repaid = roundMoney(
    active.reduce((sum, loan) => sum + loanRepaidTotal(loan.id, repayments), 0),
  );
  return {
    activeCount: active.length,
    principal: roundMoney(
      active.reduce((sum, loan) => sum + loan.principalAmount, 0),
    ),
    totalPayable,
    repaid,
    balance: loanBalance(totalPayable, repaid),
  };
}
