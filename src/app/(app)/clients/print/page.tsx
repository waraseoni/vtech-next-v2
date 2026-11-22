import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PrintClientsButton } from "@/components/clients/print-clients-button";
import { Button } from "@/components/ui/button";
import {
  getClientsExport,
  type ClientSort,
  type ClientTab,
} from "@/lib/data/clients";
import { formatIST } from "@/lib/date";
import { CLIENT_TIER_LABEL, clientTier } from "@/lib/domain/client-status";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Clients print" };

const TABS: ClientTab[] = ["all", "due", "high", "followup", "clear"];
const SORTS: ClientSort[] = ["name", "due", "billed", "paid", "lastTxn"];

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function ClientsPrintPage({
  searchParams,
}: PageProps<"/clients/print">) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const tabParam = str(params.tab);
  const tab: ClientTab = TABS.includes(tabParam as ClientTab)
    ? (tabParam as ClientTab)
    : "all";
  const minRaw = str(params.min);
  const maxRaw = str(params.max);
  const minBalance = minRaw ? Number(minRaw) : undefined;
  const maxBalance = maxRaw ? Number(maxRaw) : undefined;
  const [sortPart, dirPart] = str(params.sortdir).split(":");
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

  const totalDue = rows.reduce((sum, row) => sum + Math.max(0, row.due), 0);
  const generated = formatIST(new Date().toISOString(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/clients">
            <ArrowLeft className="size-4" aria-hidden />
            Clients
          </Link>
        </Button>
        <PrintClientsButton />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Client directory
        </h2>
        <p className="text-muted-foreground text-sm">
          {rows.length} clients · Due{" "}
          {formatINR(totalDue, { maximumFractionDigits: 0 })} · Generated{" "}
          {generated}
          {q ? ` · Search: ${q}` : ""}
          {tab !== "all" ? ` · Tab: ${tab}` : ""}
          {minRaw ? ` · Due ≥ ${minRaw}` : ""}
          {maxRaw ? ` · Due ≤ ${maxRaw}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b text-left">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 text-right font-medium">Billed</th>
              <th className="px-3 py-2 text-right font-medium">Paid</th>
              <th className="px-3 py-2 text-right font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted-foreground">#{row.id}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{row.contact}</td>
                <td className="max-w-64 px-3 py-2">{row.address}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatINR(row.billed, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatINR(row.paid, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {formatINR(row.due, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2">
                  {CLIENT_TIER_LABEL[clientTier(row.due, row.lastTxnDate)]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
