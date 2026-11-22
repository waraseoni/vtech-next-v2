import { roundMoney } from "@/lib/money";

export type LedgerKind = "opening" | "repair" | "sale" | "loan" | "payment";
export type LedgerFilter = "all" | "repairs" | "sales" | "loans" | "payments";

export type LedgerSource = {
  openingBalance: number;
  jobs: Array<{
    id: number;
    job_id: string | null;
    code: string | null;
    item: string | null;
    amount: number | null;
    status: number | null;
    date_created: string;
  }>;
  sales: Array<{
    id: number;
    sale_code: string;
    total_amount: number;
    remarks: string | null;
    date_created: string;
  }>;
  loans: Array<{
    id: number;
    principal_amount: number;
    loan_date: string;
    remarks: string | null;
  }>;
  payments: Array<{
    id: number;
    payment_date: string | null;
    amount: number;
    discount: number | null;
    payment_mode: string | null;
    payment_type: string | null;
    job_id: string | null;
    bill_no: string | null;
    loan_id: number | null;
    remarks: string | null;
  }>;
};

export type LedgerRow = {
  key: string;
  date: string;
  kind: LedgerKind;
  label: string;
  reference: string | null;
  debit: number;
  credit: number;
  discount: number;
  balance: number;
  broughtForward?: boolean;
};

export type LedgerStatement = {
  rows: LedgerRow[];
  broughtForward: number;
  totals: { debit: number; credit: number; closing: number };
};

export type LedgerOptions = {
  from?: string;
  to?: string;
  filter?: LedgerFilter;
};

function day(value: string | null | undefined): string {
  return (value ?? "").slice(0, 10);
}

function inFilter(kind: LedgerKind, filter: LedgerFilter): boolean {
  if (filter === "all") return true;
  if (kind === "opening") return false;
  if (filter === "repairs") return kind === "repair";
  if (filter === "sales") return kind === "sale";
  if (filter === "loans") return kind === "loan";
  return kind === "payment";
}

/** Combined client statement; running balance = debit − credit. */
export function buildLedger(
  source: LedgerSource,
  { from = "", to = "", filter = "all" }: LedgerOptions = {},
): LedgerStatement {
  const entries: Omit<LedgerRow, "balance" | "broughtForward">[] = [];

  if (source.openingBalance !== 0) {
    entries.push({
      key: "opening",
      date: "0000-01-01",
      kind: "opening",
      label: "Opening balance",
      reference: null,
      debit: source.openingBalance > 0 ? source.openingBalance : 0,
      credit: source.openingBalance < 0 ? Math.abs(source.openingBalance) : 0,
      discount: 0,
    });
  }

  for (const job of source.jobs) {
    entries.push({
      key: `job-${job.id}`,
      date: day(job.date_created),
      kind: "repair",
      label: job.item ?? "Repair job",
      reference: job.job_id ?? job.code,
      debit: roundMoney(job.amount ?? 0),
      credit: 0,
      discount: 0,
    });
  }

  for (const sale of source.sales) {
    entries.push({
      key: `sale-${sale.id}`,
      date: day(sale.date_created),
      kind: "sale",
      label: sale.remarks ?? "Direct sale",
      reference: sale.sale_code,
      debit: roundMoney(sale.total_amount),
      credit: 0,
      discount: 0,
    });
  }

  for (const loan of source.loans) {
    entries.push({
      key: `loan-${loan.id}`,
      date: day(loan.loan_date),
      kind: "loan",
      label: loan.remarks ?? "Loan given",
      reference: `LN-${String(loan.id).padStart(5, "0")}`,
      debit: roundMoney(loan.principal_amount),
      credit: 0,
      discount: 0,
    });
  }

  for (const payment of source.payments) {
    entries.push({
      key: `payment-${payment.id}`,
      date: day(payment.payment_date),
      kind: "payment",
      label: payment.loan_id
        ? "Loan EMI payment"
        : (payment.payment_mode ?? payment.payment_type ?? "Payment"),
      reference: payment.bill_no ?? payment.job_id ?? null,
      debit: 0,
      credit: roundMoney(payment.amount + (payment.discount ?? 0)),
      discount: roundMoney(payment.discount ?? 0),
    });
  }

  entries.sort((a, b) =>
    a.date === b.date
      ? a.key.localeCompare(b.key)
      : a.date.localeCompare(b.date),
  );

  let running = 0;
  const dated: LedgerRow[] = [];
  for (const entry of entries) {
    running = roundMoney(running + entry.debit - entry.credit);
    dated.push({ ...entry, balance: running });
  }

  const broughtForward = roundMoney(
    dated
      .filter((row) => from && row.date < from)
      .reduce((sum, row) => sum + row.debit - row.credit, 0),
  );

  const inRange = dated.filter(
    (row) => (!from || row.date >= from) && (!to || row.date <= to),
  );
  const rows = inRange.filter((row) => inFilter(row.kind, filter));

  const debit = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0));
  const credit = roundMoney(rows.reduce((sum, row) => sum + row.credit, 0));
  const closing = inRange.length
    ? inRange[inRange.length - 1].balance
    : broughtForward;

  return {
    rows,
    broughtForward,
    totals: { debit, credit, closing },
  };
}
