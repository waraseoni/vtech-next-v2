import "server-only";

import { getClientNames } from "@/lib/data/clients";
import { unwrap, unwrapMaybe } from "@/lib/data/errors";
import { formatSaleCode, nextSaleCodeSequence } from "@/lib/domain/codes";
import { clientDisplayName } from "@/lib/domain/client";
import { sumMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type SaleFilters = {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type SaleListItem = {
  id: number;
  saleCode: string;
  clientId: number | null;
  clientName: string;
  totalAmount: number;
  paymentMode: string;
  remarks: string | null;
  dateCreated: string;
};

export type SalesPage = {
  rows: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageTotal: number;
};

export type SaleItemInput = {
  productId: number | null;
  qty: number;
  price: number;
};

export type SaveSaleInput = {
  saleId?: number;
  clientId: number;
  mechanicId?: number | null;
  paymentMode: string;
  remarks?: string | null;
  lastEditedBy: number;
  lastEditedByName: string;
  items: SaleItemInput[];
};

const SALE_COLUMNS =
  "id, sale_code, client_id, mechanic_id, total_amount, payment_mode, remarks, last_edited_by, last_edited_by_name, last_edited_date, date_created";

function safeSearchTerm(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[,()*%\\]/g, " ")
    .slice(0, 60);
}

export async function getSalesPage(
  filters: SaleFilters = {},
): Promise<SalesPage> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const term = safeSearchTerm(filters.search);

  let query = supabase
    .from("direct_sales")
    .select(SALE_COLUMNS, { count: "exact" })
    .order("date_created", { ascending: false });

  if (filters.from) {
    query = query.gte("date_created", `${filters.from}T00:00:00`);
  }
  if (filters.to) {
    query = query.lte("date_created", `${filters.to}T23:59:59`);
  }
  if (term) {
    const clientMatches = unwrap(
      await supabase
        .from("client_list")
        .select("id")
        .eq("delete_flag", 0)
        .or(
          `firstname.ilike.%${term}%,lastname.ilike.%${term}%,contact.ilike.%${term}%`,
        )
        .limit(100),
      "sales.clientSearch",
    );
    const parts = [`sale_code.ilike.%${term}%`, `remarks.ilike.%${term}%`];
    if (clientMatches.length) {
      parts.push(
        `client_id.in.(${clientMatches.map((row) => row.id).join(",")})`,
      );
    }
    query = query.or(parts.join(","));
  }

  const start = (page - 1) * pageSize;
  const result = await query.range(start, start + pageSize - 1);
  const rows = unwrap(result, "sales.list");
  const clientNames = await getClientNames(
    rows.map((row) => row.client_id).filter((id): id is number => id !== null),
  );

  return {
    rows: rows.map((row) => ({
      id: row.id,
      saleCode: row.sale_code,
      clientId: row.client_id,
      clientName:
        clientNames.get(row.client_id ?? -1) ??
        (row.client_id ? `Client #${row.client_id}` : "Walk-in"),
      totalAmount: row.total_amount,
      paymentMode: row.payment_mode,
      remarks: row.remarks,
      dateCreated: row.date_created,
    })),
    total: result.count ?? rows.length,
    page,
    pageSize,
    pageTotal: sumMoney(rows.map((row) => row.total_amount)),
  };
}

export async function getSaleDetail(id: number) {
  const supabase = await createClient();

  const [saleRes, itemsRes] = await Promise.all([
    supabase
      .from("direct_sales")
      .select(SALE_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("direct_sale_items")
      .select("id, product_id, qty, price")
      .eq("sale_id", id)
      .order("id"),
  ]);

  const sale = unwrapMaybe(saleRes, "sales.detail");
  if (!sale) return null;

  const items = unwrap(itemsRes, "sales.items");
  const productIds = [
    ...new Set(
      items
        .map((item) => item.product_id)
        .filter((id): id is number => id !== null),
    ),
  ];
  const [clientNames, productRows, mechanic] = await Promise.all([
    getClientNames(sale.client_id ? [sale.client_id] : []),
    productIds.length
      ? supabase.from("product_list").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    sale.mechanic_id
      ? supabase
          .from("mechanic_list")
          .select("firstname, lastname")
          .eq("id", sale.mechanic_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const productNames = new Map(
    unwrap(productRows, "sales.products").map((row) => [row.id, row.name]),
  );

  return {
    sale: {
      ...sale,
      clientName:
        clientNames.get(sale.client_id ?? -1) ??
        (sale.client_id ? `Client #${sale.client_id}` : "Walk-in"),
      mechanicName: mechanic.data
        ? `${mechanic.data.firstname} ${mechanic.data.lastname}`.trim()
        : null,
    },
    items: items.map((item) => ({
      ...item,
      productName: item.product_id
        ? (productNames.get(item.product_id) ?? `#${item.product_id}`)
        : "Free-text item",
      lineTotal: Math.round(item.qty * item.price * 100) / 100,
    })),
  };
}

export async function getNextSaleCode(): Promise<string> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("direct_sales")
      .select("sale_code")
      .order("sale_code", { ascending: false })
      .limit(200),
    "sales.nextCode",
  );
  return formatSaleCode(nextSaleCodeSequence(rows.map((row) => row.sale_code)));
}

export async function createSale(input: SaveSaleInput) {
  const supabase = await createClient();
  const saleCode = await claimSaleCode();

  const id = unwrap(
    await supabase.rpc("save_direct_sale", {
      p_sale_code: saleCode,
      p_client_id: input.clientId,
      p_mechanic_id: input.mechanicId ?? null,
      p_payment_mode: input.paymentMode,
      p_remarks: input.remarks ?? null,
      p_last_edited_by: input.lastEditedBy,
      p_last_edited_by_name: input.lastEditedByName,
      p_items: saleItemsPayload(input.items),
    }),
    "sales.create",
  );

  return { id, saleCode };
}

export async function updateSale(input: SaveSaleInput & { saleId: number }) {
  const supabase = await createClient();
  const id = unwrap(
    await supabase.rpc("save_direct_sale", {
      p_sale_id: input.saleId,
      p_client_id: input.clientId,
      p_mechanic_id: input.mechanicId ?? null,
      p_payment_mode: input.paymentMode,
      p_remarks: input.remarks ?? null,
      p_last_edited_by: input.lastEditedBy,
      p_last_edited_by_name: input.lastEditedByName,
      p_items: saleItemsPayload(input.items),
    }),
    "sales.update",
  );

  return { id };
}

/** RPC shape (snake_case, integer qty, nullable product_id). */
function saleItemsPayload(items: SaleItemInput[]) {
  return items.map((item) => ({
    product_id: item.productId && item.productId > 0 ? item.productId : null,
    qty: Math.max(1, Math.round(item.qty)),
    price: item.price,
  }));
}

export async function getSaleFormOptions() {
  const supabase = await createClient();
  const [clients, mechanics, products] = await Promise.all([
    supabase
      .from("client_list")
      .select("id, firstname, middlename, lastname, contact")
      .eq("delete_flag", 0)
      .order("firstname"),
    supabase
      .from("mechanic_list")
      .select("id, firstname, lastname")
      .eq("delete_flag", 0)
      .eq("status", 1)
      .order("firstname"),
    supabase
      .from("product_list")
      .select("id, name, price")
      .eq("delete_flag", 0)
      .eq("status", 1)
      .order("name"),
  ]);

  return {
    clients: unwrap(clients, "sales.options.clients").map((client) => ({
      id: client.id,
      name: clientDisplayName(client),
      contact: client.contact,
    })),
    mechanics: unwrap(mechanics, "sales.options.mechanics").map((mechanic) => ({
      id: mechanic.id,
      name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
    })),
    products: unwrap(products, "sales.options.products"),
  };
}

async function claimSaleCode(): Promise<string> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("direct_sales")
      .select("sale_code")
      .order("sale_code", { ascending: false })
      .limit(200),
    "sales.codes",
  );

  let candidate = formatSaleCode(
    nextSaleCodeSequence(rows.map((row) => row.sale_code)),
  );
  for (let attempt = 0; attempt < 3; attempt++) {
    const { count } = await supabase
      .from("direct_sales")
      .select("id", { count: "exact", head: true })
      .eq("sale_code", candidate);
    if (!count) return candidate;
    candidate = formatSaleCode(
      nextSaleCodeSequence([...rows.map((row) => row.sale_code), candidate]),
    );
  }
  return candidate;
}
