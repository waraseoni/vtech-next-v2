import "server-only";

import { unwrap, unwrapMaybe } from "@/lib/data/errors";
import { createClient } from "@/lib/supabase/server";

export type ClientLoanRow = {
  id: number;
  client_id: number;
  principal_amount: number;
  interest_rate: number | null;
  loan_period: number;
  total_payable: number;
  emi_amount: number;
  remarks: string | null;
  loan_date: string;
  status: number | null;
  created_at: string | null;
};

export type LoanInput = {
  clientId: number;
  principal: number;
  interestRate: number;
  months: number;
  totalPayable: number;
  emi: number;
  loanDate: string;
  remarks?: string | null;
};

const LOAN_COLUMNS =
  "id, client_id, principal_amount, interest_rate, loan_period, total_payable, emi_amount, remarks, loan_date, status, created_at";

export async function listClientLoans(
  clientId: number,
): Promise<ClientLoanRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("client_loans")
    .select(LOAN_COLUMNS)
    .eq("client_id", clientId)
    .order("loan_date", { ascending: false })
    .order("id", { ascending: false });
  return unwrap(result, "clients.loans") as ClientLoanRow[];
}

export async function getClientLoan(
  clientId: number,
  loanId: number,
): Promise<ClientLoanRow | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("client_loans")
    .select(LOAN_COLUMNS)
    .eq("client_id", clientId)
    .eq("id", loanId)
    .maybeSingle();
  return unwrapMaybe(result, "clients.loan") as ClientLoanRow | null;
}

export async function createClientLoan(input: LoanInput) {
  const supabase = await createClient();
  const result = await supabase
    .from("client_loans")
    .insert({
      client_id: input.clientId,
      principal_amount: input.principal,
      interest_rate: input.interestRate,
      loan_period: input.months,
      total_payable: input.totalPayable,
      emi_amount: input.emi,
      loan_date: input.loanDate,
      remarks: input.remarks || null,
      status: 1,
    })
    .select("id")
    .single();
  return unwrap(result, "clients.loan.create") as { id: number };
}

export async function setClientLoanStatus(loanId: number, status: number) {
  const supabase = await createClient();
  const result = await supabase
    .from("client_loans")
    .update({ status })
    .eq("id", loanId)
    .select("id")
    .single();
  return unwrap(result, "clients.loan.status");
}

export async function deleteClientLoan(loanId: number) {
  const supabase = await createClient();
  const result = await supabase
    .from("client_loans")
    .delete()
    .eq("id", loanId)
    .select("id")
    .single();
  return unwrap(result, "clients.loan.delete");
}

export type LoanRegisterFilters = {
  search?: string;
  status?: "active" | "closed" | "all";
  page?: number;
  pageSize?: number;
};

export type LoanRegister = {
  rows: Array<
    ClientLoanRow & { clientName: string; repaid: number; balance: number }
  >;
  total: number;
  page: number;
  pageSize: number;
  totals: {
    principal: number;
    payable: number;
    repaid: number;
    balance: number;
  };
};

export async function getLoanRegister({
  search = "",
  status = "all",
  page = 1,
  pageSize = 25,
}: LoanRegisterFilters): Promise<LoanRegister> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(10, pageSize));

  let query = supabase
    .from("client_loans")
    .select(LOAN_COLUMNS)
    .order("loan_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);

  if (status === "active") query = query.eq("status", 1);
  if (status === "closed") query = query.neq("status", 1);

  const loans = unwrap(
    await query,
    "clients.loans.register",
  ) as ClientLoanRow[];

  const [clientsRes, paymentsRes] = await Promise.all([
    supabase
      .from("client_list")
      .select("id, firstname, middlename, lastname")
      .in("id", [...new Set(loans.map((loan) => loan.client_id))]),
    supabase
      .from("client_payments")
      .select("loan_id, amount, discount")
      .not("loan_id", "is", null)
      .limit(5000),
  ]);

  const clients = unwrap(clientsRes, "clients.loans.clients") as Array<{
    id: number;
    firstname: string | null;
    middlename: string | null;
    lastname: string | null;
  }>;
  const repayments = unwrap(paymentsRes, "clients.loans.payments") as Array<{
    loan_id: number | null;
    amount: number;
    discount: number | null;
  }>;

  const nameById = new Map(
    clients.map((client) => [
      client.id,
      [client.firstname, client.middlename, client.lastname]
        .map((part) => (part ?? "").trim())
        .filter(Boolean)
        .join(" "),
    ]),
  );
  const repaidByLoan = new Map<number, number>();
  for (const payment of repayments) {
    if (payment.loan_id == null) continue;
    repaidByLoan.set(
      payment.loan_id,
      (repaidByLoan.get(payment.loan_id) ?? 0) +
        payment.amount +
        (payment.discount ?? 0),
    );
  }

  const term = search.trim().toLowerCase();
  const merged = loans
    .map((loan) => {
      const repaid = Math.round((repaidByLoan.get(loan.id) ?? 0) * 100) / 100;
      return {
        ...loan,
        clientName: nameById.get(loan.client_id) ?? `Client #${loan.client_id}`,
        repaid,
        balance:
          Math.round(Math.max(0, loan.total_payable - repaid) * 100) / 100,
      };
    })
    .filter((loan) => {
      if (!term) return true;
      return (
        loan.clientName.toLowerCase().includes(term) ||
        String(loan.id).includes(term) ||
        String(loan.principal_amount).includes(term)
      );
    });

  const totals = merged.reduce(
    (sum, loan) => ({
      principal: sum.principal + loan.principal_amount,
      payable: sum.payable + loan.total_payable,
      repaid: sum.repaid + loan.repaid,
      balance: sum.balance + loan.balance,
    }),
    { principal: 0, payable: 0, repaid: 0, balance: 0 },
  );

  const lastPage = Math.max(1, Math.ceil(merged.length / safeSize));
  const safePageNo = Math.min(safePage, lastPage);
  const start = (safePageNo - 1) * safeSize;

  return {
    rows: merged.slice(start, start + safeSize),
    total: merged.length,
    page: safePageNo,
    pageSize: safeSize,
    totals: {
      principal: Math.round(totals.principal * 100) / 100,
      payable: Math.round(totals.payable * 100) / 100,
      repaid: Math.round(totals.repaid * 100) / 100,
      balance: Math.round(totals.balance * 100) / 100,
    },
  };
}
