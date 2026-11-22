import "server-only";

import { unwrap, unwrapMaybe } from "@/lib/data/errors";
import {
  buildLedger,
  type LedgerFilter,
  type LedgerSource,
  type LedgerStatement,
} from "@/lib/domain/client-ledger";
import { createClient } from "@/lib/supabase/server";

export type ClientLedgerData = {
  client: {
    id: number;
    firstname: string;
    middlename: string | null;
    lastname: string;
    contact: string;
    address: string;
  };
  statement: LedgerStatement;
};

export async function getClientLedger(
  clientId: number,
  {
    from = "",
    to = "",
    filter = "all",
  }: { from?: string; to?: string; filter?: LedgerFilter } = {},
): Promise<ClientLedgerData | null> {
  const supabase = await createClient();

  const [clientRes, jobsRes, salesRes, loansRes, paymentsRes] =
    await Promise.all([
      supabase
        .from("client_list")
        .select(
          "id, firstname, middlename, lastname, contact, address, opening_balance",
        )
        .eq("id", clientId)
        .eq("delete_flag", 0)
        .maybeSingle(),
      supabase
        .from("transaction_list")
        .select("id, job_id, code, item, amount, status, date_created")
        .eq("client_name", String(clientId))
        .eq("del_status", 0)
        .order("date_created", { ascending: true })
        .limit(1000),
      supabase
        .from("direct_sales")
        .select("id, sale_code, total_amount, remarks, date_created")
        .eq("client_id", clientId)
        .order("date_created", { ascending: true })
        .limit(1000),
      supabase
        .from("client_loans")
        .select("id, principal_amount, loan_date, remarks")
        .eq("client_id", clientId)
        .order("loan_date", { ascending: true })
        .limit(500),
      supabase
        .from("client_payments")
        .select(
          "id, payment_date, amount, discount, payment_mode, payment_type, job_id, bill_no, loan_id, remarks",
        )
        .eq("client_id", clientId)
        .order("payment_date", { ascending: true })
        .order("id", { ascending: true })
        .limit(1000),
    ]);

  const client = unwrapMaybe(clientRes, "clients.ledger.client") as {
    id: number;
    firstname: string;
    middlename: string | null;
    lastname: string;
    contact: string;
    address: string;
    opening_balance: number | null;
  } | null;
  if (!client) return null;

  const statement = buildLedger(
    {
      openingBalance: client.opening_balance ?? 0,
      jobs: unwrap(jobsRes, "clients.ledger.jobs") as LedgerSource["jobs"],
      sales: unwrap(salesRes, "clients.ledger.sales") as LedgerSource["sales"],
      loans: unwrap(loansRes, "clients.ledger.loans") as LedgerSource["loans"],
      payments: unwrap(
        paymentsRes,
        "clients.ledger.payments",
      ) as LedgerSource["payments"],
    },
    { from, to, filter },
  );

  return {
    client: {
      id: client.id,
      firstname: client.firstname,
      middlename: client.middlename,
      lastname: client.lastname,
      contact: client.contact,
      address: client.address,
    },
    statement,
  };
}
