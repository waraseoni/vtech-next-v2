import { getSession } from "@/lib/auth";
import {
  getClientsExport,
  type ClientSort,
  type ClientTab,
} from "@/lib/data/clients";
import { isStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABS: ClientTab[] = ["all", "due", "high", "followup", "clear"];
const SORTS: ClientSort[] = ["name", "due", "billed", "paid", "lastTxn"];

function str(value: string | null): string {
  return value ?? "";
}

function csvCell(value: string | number | null): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !isStaffRole(session.profile.role)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = str(url.searchParams.get("q")).trim();
  const tabParam = str(url.searchParams.get("tab"));
  const tab: ClientTab = TABS.includes(tabParam as ClientTab)
    ? (tabParam as ClientTab)
    : "all";
  const minRaw = str(url.searchParams.get("min"));
  const maxRaw = str(url.searchParams.get("max"));
  const minBalance = minRaw ? Number(minRaw) : undefined;
  const maxBalance = maxRaw ? Number(maxRaw) : undefined;
  const [sortPart, dirPart] = str(url.searchParams.get("sortdir")).split(":");
  const sort: ClientSort = SORTS.includes(sortPart as ClientSort)
    ? (sortPart as ClientSort)
    : "name";
  const dir = dirPart === "desc" ? "desc" : "asc";

  const rows = await getClientsExport({
    search: q,
    tab,
    minBalance: Number.isFinite(minBalance) ? minBalance : undefined,
    maxBalance: Number.isFinite(maxBalance) ? maxBalance : undefined,
    sort,
    dir,
  });

  const header = [
    "Client ID",
    "Name",
    "Contact",
    "Email",
    "Address",
    "Opening balance",
    "Billed",
    "Paid",
    "Due",
    "Last txn",
  ];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.name,
        row.contact,
        row.email,
        row.address,
        row.openingBalance.toFixed(2),
        row.billed.toFixed(2),
        row.paid.toFixed(2),
        row.due.toFixed(2),
        row.lastTxnDate ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
