import "server-only";

import { cache } from "react";

import { unwrap, unwrapMaybe } from "@/lib/data/errors";
import { clientFinancialsSchema, parseJson } from "@/lib/data/schemas";
import { createClient } from "@/lib/supabase/server";
import {
  clientDisplayName,
  computeClientBalance,
  type ClientBalance,
} from "@/lib/domain/client";
import { sumMoney } from "@/lib/money";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

export type ClientListItem = ClientBalance & {
  id: number;
  name: string;
  contact: string;
  email: string;
  address: string;
  openingBalance: number;
  lastTxnDate: string | null;
};

export type ClientsPage = {
  rows: ClientListItem[];
  total: number;
  page: number;
  pageSize: number;
  dueCount: number;
  dueTotal: number;
  counts: {
    all: number;
    due: number;
    high: number;
    clear: number;
    followup: number;
  };
};

export type ClientTab = "all" | "due" | "high" | "clear" | "followup";
export type ClientSort = "name" | "due" | "billed" | "paid" | "lastTxn";

export type ClientFilters = {
  search?: string;
  tab?: ClientTab;
  /** @deprecated use `tab: "due"` */
  dueOnly?: boolean;
  minBalance?: number;
  maxBalance?: number;
  sort?: ClientSort;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const CLIENT_COLUMNS =
  "id, firstname, middlename, lastname, contact, email, address, opening_balance, delete_flag, date_created, date_updated, payment_due_date, payment_due_remarks";

function safeSearchTerm(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[,()*%\\]/g, " ")
    .slice(0, 60);
}

function daysSinceDate(value: string | null, today: Date): number | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000);
}

function matchesTab(row: ClientListItem, tab: ClientTab, today: Date): boolean {
  if (tab === "all") return true;
  if (tab === "due") return row.due > 0;
  if (tab === "high") return row.due > 20_000;
  const days = daysSinceDate(row.lastTxnDate, today);
  if (tab === "followup") return row.due <= 0 && days != null && days > 30;
  return row.due <= 0 && (days == null || days <= 30);
}

/** One RPC for every client's money + one query for profile rows. */
export const getClientsFinancials = cache(async () => {
  const supabase = await createClient();
  const result = await supabase.rpc("get_clients_page_financials");
  return parseJson(
    clientFinancialsSchema,
    unwrap(result, "clients.financials"),
    "clients.financials",
  );
});

export async function getClientsPage(
  filters: ClientFilters = {},
): Promise<ClientsPage> {
  const { directory, counts, dueRows } = await getClientDirectory(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const lastPage = Math.max(1, Math.ceil(directory.length / pageSize));
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;

  return {
    rows: directory.slice(start, start + pageSize),
    total: directory.length,
    page: safePage,
    pageSize,
    dueCount: dueRows.length,
    dueTotal: sumMoney(dueRows.map((row) => row.due)),
    counts,
  };
}

/** Full filtered directory (no paging) for CSV export. */
export async function getClientsExport(
  filters: ClientFilters = {},
): Promise<ClientListItem[]> {
  const { directory } = await getClientDirectory(filters);
  return directory;
}

async function getClientDirectory(filters: ClientFilters) {
  const supabase = await createClient();
  const term = safeSearchTerm(filters.search);
  const tab: ClientTab = filters.dueOnly ? "due" : (filters.tab ?? "all");

  let query = supabase
    .from("client_list")
    .select(CLIENT_COLUMNS)
    .eq("delete_flag", 0)
    .order("firstname", { ascending: true })
    .order("lastname", { ascending: true });

  if (term) {
    query = query.or(
      `firstname.ilike.%${term}%,lastname.ilike.%${term}%,contact.ilike.%${term}%,email.ilike.%${term}%,address.ilike.%${term}%`,
    );
  }

  const [clients, financials] = await Promise.all([
    query,
    getClientsFinancials(),
  ]);

  const clientRows = unwrap(clients, "clients.list");
  const financeById = new Map(financials.map((row) => [row.client_id, row]));

  const merged = clientRows.map<ClientListItem>((row) => {
    const finance = financeById.get(row.id);
    const balance = computeClientBalance({
      openingBalance: row.opening_balance,
      repairBilled: finance?.repair_billed,
      directSalesBilled: finance?.direct_sales_billed,
      servicePaid: finance?.service_paid,
    });
    return {
      id: row.id,
      name: clientDisplayName(row),
      contact: row.contact,
      email: row.email ?? "",
      address: row.address,
      openingBalance: row.opening_balance ?? 0,
      lastTxnDate: finance?.last_txn_date ?? null,
      ...balance,
    };
  });

  const min = Number.isFinite(filters.minBalance) ? filters.minBalance : null;
  const max = Number.isFinite(filters.maxBalance) ? filters.maxBalance : null;
  const ranged = merged.filter(
    (row) => (min == null || row.due >= min) && (max == null || row.due <= max),
  );

  const today = new Date();
  const counts = {
    all: ranged.length,
    due: ranged.filter((row) => row.due > 0).length,
    high: ranged.filter((row) => row.due > 20_000).length,
    clear: ranged.filter((row) => matchesTab(row, "clear", today)).length,
    followup: ranged.filter((row) => matchesTab(row, "followup", today)).length,
  };

  const directory = ranged.filter((row) => matchesTab(row, tab, today));
  const sort = filters.sort ?? "name";
  const direction = filters.dir === "desc" ? -1 : 1;
  directory.sort((a, b) => {
    if (sort === "due") return (a.due - b.due) * direction;
    if (sort === "billed") return (a.billed - b.billed) * direction;
    if (sort === "paid") return (a.paid - b.paid) * direction;
    if (sort === "lastTxn") {
      return (
        (a.lastTxnDate ?? "").localeCompare(b.lastTxnDate ?? "") * direction
      );
    }
    return a.name.localeCompare(b.name) * direction;
  });

  return {
    directory,
    counts,
    dueRows: merged.filter((row) => row.due > 0),
  };
}

export async function getClientNames(
  ids: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
  if (!unique.length) return new Map();

  const supabase = await createClient();
  const result = await supabase
    .from("client_list")
    .select("id, firstname, middlename, lastname")
    .in("id", unique);

  const rows = unwrap(result, "clients.names");
  return new Map(rows.map((row) => [row.id, clientDisplayName(row)]));
}

export type ClientSummary = { id: number; name: string; contact: string };

export async function getClientSummaries(
  ids: number[],
): Promise<ClientSummary[]> {
  const unique = [
    ...new Set(ids.filter((id) => Number.isSafeInteger(id))),
  ].slice(0, 200);
  if (!unique.length) return [];

  const supabase = await createClient();
  const result = await supabase
    .from("client_list")
    .select("id, firstname, middlename, lastname, contact")
    .in("id", unique)
    .eq("delete_flag", 0);

  const rows = unwrap(result, "clients.summaries");
  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: clientDisplayName(row),
        contact: row.contact,
      } satisfies ClientSummary,
    ]),
  );
  return unique
    .map((id) => byId.get(id))
    .filter((row): row is ClientSummary => row != null);
}

export async function getClientDetail(id: number) {
  const supabase = await createClient();

  const [
    clientRes,
    contactsRes,
    paymentsRes,
    jobsRes,
    salesRes,
    loansRes,
    financials,
  ] = await Promise.all([
    supabase
      .from("client_list")
      .select(CLIENT_COLUMNS)
      .eq("id", id)
      .eq("delete_flag", 0)
      .maybeSingle(),
    supabase
      .from("client_contacts")
      .select("id, name, label, phone, is_primary")
      .eq("client_id", id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("client_payments")
      .select(
        "id, job_id, loan_id, bill_no, payment_date, amount, discount, net_amount, payment_mode, payment_type, remarks",
      )
      .eq("client_id", id)
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(200),
    supabase
      .from("transaction_list")
      .select(
        "id, job_id, code, item, fault, amount, status, date_created, date_completed",
      )
      .eq("client_name", String(id))
      .eq("del_status", 0)
      .order("date_created", { ascending: false })
      .limit(100),
    supabase
      .from("direct_sales")
      .select(
        "id, sale_code, total_amount, payment_mode, remarks, date_created",
      )
      .eq("client_id", id)
      .order("date_created", { ascending: false })
      .limit(100),
    supabase
      .from("client_loans")
      .select(
        "id, principal_amount, interest_rate, loan_period, total_payable, emi_amount, remarks, loan_date, status",
      )
      .eq("client_id", id)
      .order("loan_date", { ascending: false }),
    getClientsFinancials(),
  ]);

  const client = unwrapMaybe(clientRes, "clients.detail");
  if (!client) return null;

  const finance = financials.find((row) => row.client_id === id);
  const balance = computeClientBalance({
    openingBalance: client.opening_balance,
    repairBilled: finance?.repair_billed,
    directSalesBilled: finance?.direct_sales_billed,
    servicePaid: finance?.service_paid,
  });

  return {
    client: { ...client, name: clientDisplayName(client) },
    balance,
    finance: finance ?? null,
    contacts: unwrap(contactsRes, "clients.contacts"),
    payments: unwrap(paymentsRes, "clients.payments"),
    jobs: unwrap(jobsRes, "clients.jobs"),
    sales: unwrap(salesRes, "clients.sales"),
    loans: unwrap(loansRes, "clients.loans"),
  };
}

export async function createClientRecord(input: TablesInsert<"client_list">) {
  const supabase = await createClient();
  const result = await supabase
    .from("client_list")
    .insert(input)
    .select("id")
    .single();
  return unwrap(result, "clients.create");
}

export async function updateClientRecord(
  id: number,
  input: TablesUpdate<"client_list">,
) {
  const supabase = await createClient();
  const result = await supabase
    .from("client_list")
    .update({ ...input, date_updated: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  return unwrap(result, "clients.update");
}

export async function softDeleteClient(id: number) {
  return updateClientRecord(id, { delete_flag: 1 });
}
