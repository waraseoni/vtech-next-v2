import {
  AlertTriangle,
  ChevronRight,
  Download,
  FileDown,
  HandCoins,
  IndianRupee,
  Plus,
  Printer,
  ReceiptIndianRupee,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ClientRowActions } from "@/components/clients/client-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiveSearchInput } from "@/components/ui/live-search-input";
import { Select } from "@/components/ui/select";
import { requireSession } from "@/lib/auth";
import {
  getClientsPage,
  type ClientSort,
  type ClientTab,
} from "@/lib/data/clients";
import { formatIST } from "@/lib/date";
import { clientInitials } from "@/lib/domain/client";
import {
  CLIENT_TIER_LABEL,
  clientTier,
  daysSince,
  type ClientTier,
} from "@/lib/domain/client-status";
import { formatINR } from "@/lib/money";
import { canDeleteRecords } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Clients" };

const PAGE_SIZE = 25;
const TABS: Array<{ key: ClientTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "due", label: "Due" },
  { key: "high", label: "High risk" },
  { key: "followup", label: "Follow-up" },
  { key: "clear", label: "Clear" },
];
const SORT_OPTIONS = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "due:desc", label: "Due (high → low)" },
  { value: "due:asc", label: "Due (low → high)" },
  { value: "billed:desc", label: "Billed (high → low)" },
  { value: "paid:desc", label: "Paid (high → low)" },
  { value: "lastTxn:desc", label: "Last txn (recent)" },
];
const SORTS: ClientSort[] = ["name", "due", "billed", "paid", "lastTxn"];

type Filters = {
  q: string;
  tab: ClientTab;
  min: string;
  max: string;
  sortdir: string;
  size: number;
  page: number;
};

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function num(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clientsHref(filters: Filters, overrides: Partial<Filters> = {}) {
  const next = { ...filters, ...overrides };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.tab !== "all") search.set("tab", next.tab);
  if (next.min) search.set("min", next.min);
  if (next.max) search.set("max", next.max);
  if (next.sortdir !== "name:asc") search.set("sortdir", next.sortdir);
  if (next.size !== PAGE_SIZE) search.set("size", String(next.size));
  if (next.page > 1) search.set("page", String(next.page));
  const query = search.toString();
  return query ? `/clients?${query}` : "/clients";
}

const TIER_VARIANT: Record<
  ClientTier,
  "destructive" | "warning" | "secondary" | "success"
> = {
  "high-risk": "destructive",
  due: "warning",
  "follow-up": "secondary",
  clear: "success",
};

function TierBadge({
  due,
  lastTxnDate,
}: {
  due: number;
  lastTxnDate: string | null;
}) {
  const tier = clientTier(due, lastTxnDate);
  return <Badge variant={TIER_VARIANT[tier]}>{CLIENT_TIER_LABEL[tier]}</Badge>;
}

function lastTxnLabel(value: string | null): string {
  if (!value) return "—";
  const days = daysSince(value);
  if (days == null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function normalizeTab(value: string, dueOnly: boolean): ClientTab {
  if (dueOnly) return "due";
  return TABS.some((tab) => tab.key === value) ? (value as ClientTab) : "all";
}

export default async function ClientsPage({
  searchParams,
}: PageProps<"/clients">) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const tab = normalizeTab(str(params.tab), params.due === "1");
  const min = str(params.min);
  const max = str(params.max);
  const sortRaw = str(params.sortdir) || "name:asc";
  const [sortPart, dirPart] = sortRaw.split(":");
  const sort: ClientSort = SORTS.includes(sortPart as ClientSort)
    ? (sortPart as ClientSort)
    : "name";
  const dir = dirPart === "desc" ? "desc" : "asc";
  const sortdir = `${sort}:${dir}`;
  const requestedSize = Number(str(params.size));
  const size =
    Number.isFinite(requestedSize) && requestedSize >= 10
      ? Math.min(100, Math.floor(requestedSize))
      : PAGE_SIZE;
  const requestedPage = Number(str(params.page));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const filters: Filters = { q, tab, min, max, sortdir, size, page };

  const [session, data] = await Promise.all([
    requireSession(),
    getClientsPage({
      search: q,
      tab,
      minBalance: num(min),
      maxBalance: num(max),
      sort,
      dir,
      page,
      pageSize: size,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = start + data.rows.length - 1;
  const filtered = Boolean(q) || tab !== "all" || Boolean(min) || Boolean(max);
  const canDelete = canDeleteRecords(session.profile.role);
  const sharedParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(tab !== "all" ? { tab } : {}),
    ...(min ? { min } : {}),
    ...(max ? { max } : {}),
    sortdir,
  }).toString();
  const exportHref = `/clients/export?${sharedParams}`;
  const printHref = `/clients/print?${sharedParams}`;

  const tabCounts: Record<ClientTab, number> = {
    all: data.counts.all,
    due: data.counts.due,
    high: data.counts.high,
    followup: data.counts.followup,
    clear: data.counts.clear,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Directory</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Clients
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Billing, dues aur service history ek jagah.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/clients/loans">
              <HandCoins className="size-4" aria-hidden />
              Loan register
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/clients/payments">
              <ReceiptIndianRupee className="size-4" aria-hidden />
              Payments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={exportHref}>
              <Download className="size-4" aria-hidden />
              CSV
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={printHref}>
              <Printer className="size-4" aria-hidden />
              Print
            </Link>
          </Button>
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="size-4" aria-hidden />
              New client
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>
                {filtered ? "Matching clients" : "Total clients"}
              </CardDescription>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("en-IN").format(data.total)}
              </p>
            </div>
            <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
              <Users className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>Due clients</CardDescription>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("en-IN").format(data.dueCount)}
              </p>
            </div>
            <span className="bg-warning/10 text-warning grid size-9 place-items-center rounded-lg">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>High risk (₹20k+)</CardDescription>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("en-IN").format(data.counts.high)}
              </p>
            </div>
            <span className="bg-destructive/10 text-destructive grid size-9 place-items-center rounded-lg">
              <ShieldAlert className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>Total due</CardDescription>
              <p className="text-destructive mt-1 text-2xl font-semibold tabular-nums">
                {formatINR(data.dueTotal, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <span className="bg-destructive/10 text-destructive grid size-9 place-items-center rounded-lg">
              <IndianRupee className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Button
              key={item.key}
              asChild
              variant={active ? "default" : "outline"}
              size="sm"
            >
              <Link href={clientsHref(filters, { tab: item.key, page: 1 })}>
                {item.label}
                <Badge
                  variant={active ? "secondary" : "outline"}
                  className="ml-1 tabular-nums"
                >
                  {tabCounts[item.key]}
                </Badge>
              </Link>
            </Button>
          );
        })}
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto]">
          <form
            action="/clients"
            method="get"
            className="flex min-w-0 flex-wrap items-end gap-2"
          >
            {tab !== "all" ? (
              <input type="hidden" name="tab" value={tab} />
            ) : null}
            {sortdir !== "name:asc" ? (
              <input type="hidden" name="sortdir" value={sortdir} />
            ) : null}
            {size !== PAGE_SIZE ? (
              <input type="hidden" name="size" value={String(size)} />
            ) : null}
            <div className="min-w-0 flex-1">
              <Label htmlFor="client-search" className="sr-only">
                Search clients
              </Label>
              <LiveSearchInput
                id="client-search"
                defaultValue={q}
                placeholder="Name, phone, email ya address"
                ariaLabel="Search clients"
              />
            </div>
            <div className="grid w-24 gap-1">
              <Label htmlFor="min-balance" className="text-xs">
                Due ≥
              </Label>
              <Input
                id="min-balance"
                name="min"
                type="number"
                inputMode="numeric"
                step="100"
                defaultValue={min}
                placeholder="0"
              />
            </div>
            <div className="grid w-24 gap-1">
              <Label htmlFor="max-balance" className="text-xs">
                Due ≤
              </Label>
              <Input
                id="max-balance"
                name="max"
                type="number"
                inputMode="numeric"
                step="100"
                defaultValue={max}
                placeholder="—"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {filtered ? (
              <Button asChild variant="ghost">
                <Link href="/clients">Clear</Link>
              </Button>
            ) : null}
          </form>

          <form action="/clients" method="get" className="flex items-end gap-2">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {tab !== "all" ? (
              <input type="hidden" name="tab" value={tab} />
            ) : null}
            {min ? <input type="hidden" name="min" value={min} /> : null}
            {max ? <input type="hidden" name="max" value={max} /> : null}
            {size !== PAGE_SIZE ? (
              <input type="hidden" name="size" value={String(size)} />
            ) : null}
            <div className="grid gap-1">
              <Label htmlFor="client-sort" className="text-xs">
                Sort
              </Label>
              <Select
                id="client-sort"
                name="sortdir"
                defaultValue={sortdir}
                className="w-44"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <form id="clients-bulk" action="/clients/whatsapp" method="get">
        <Card className="gap-0 overflow-hidden py-0">
          {data.rows.length === 0 ? (
            <div className="grid place-items-center gap-3 px-4 py-16 text-center">
              <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
                <Users className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">Koi client nahi mila</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Search ya filter badal kar dekhein.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/clients/new">New client</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="divide-y md:hidden">
                {data.rows.map((row) => (
                  <li key={row.id} className="flex items-start gap-2 px-4 py-3">
                    <input
                      type="checkbox"
                      name="id"
                      value={row.id}
                      form="clients-bulk"
                      aria-label={`Select ${row.name}`}
                      className="mt-2 size-4 shrink-0 rounded border"
                    />
                    <Link
                      href={`/clients/${row.id}`}
                      className="hover:bg-muted/40 -my-1 flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1"
                    >
                      <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                        {clientInitials(row.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {row.contact}
                          {row.address ? ` · ${row.address}` : ""}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <TierBadge
                            due={row.due}
                            lastTxnDate={row.lastTxnDate}
                          />
                          <span className="text-muted-foreground text-xs">
                            {lastTxnLabel(row.lastTxnDate)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-muted-foreground text-xs">Due</p>
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            row.due > 0 && "text-destructive",
                            row.due < 0 && "text-success",
                          )}
                        >
                          {formatINR(row.due, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <ChevronRight
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                      <th className="w-10 px-3 py-3">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-3 py-3 font-medium">Client</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="hidden px-3 py-3 font-medium lg:table-cell">
                        Address
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        Billed
                      </th>
                      <th className="px-3 py-3 text-right font-medium">Paid</th>
                      <th className="px-3 py-3 text-right font-medium">Due</th>
                      <th className="hidden px-3 py-3 font-medium xl:table-cell">
                        Last txn
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/40 border-b last:border-0"
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            name="id"
                            value={row.id}
                            form="clients-bulk"
                            aria-label={`Select ${row.name}`}
                            className="size-4 rounded border"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                              {clientInitials(row.name)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/clients/${row.id}`}
                                className="font-medium hover:underline"
                              >
                                {row.name}
                              </Link>
                              <p className="text-muted-foreground text-xs">
                                {row.contact}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <TierBadge
                            due={row.due}
                            lastTxnDate={row.lastTxnDate}
                          />
                        </td>
                        <td className="hidden max-w-56 px-3 py-3 lg:table-cell">
                          <p className="text-muted-foreground truncate text-xs">
                            {row.address || "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatINR(row.billed, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-muted-foreground px-3 py-3 text-right tabular-nums">
                          {formatINR(row.paid, { maximumFractionDigits: 0 })}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-medium tabular-nums",
                            row.due > 0 && "text-destructive",
                            row.due < 0 && "text-success",
                          )}
                        >
                          {formatINR(row.due, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-muted-foreground hidden px-3 py-3 text-xs xl:table-cell">
                          {row.lastTxnDate
                            ? formatIST(row.lastTxnDate, {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })
                            : "—"}
                          <span className="block">
                            {lastTxnLabel(row.lastTxnDate)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <ClientRowActions
                            id={row.id}
                            name={row.name}
                            contact={row.contact}
                            canDelete={canDelete}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-muted-foreground">
                    Showing{" "}
                    <span className="text-foreground font-medium">
                      {start}–{end}
                    </span>{" "}
                    of {data.total}
                  </p>
                  <Button type="submit" variant="outline" size="sm">
                    <FileDown className="size-4" aria-hidden />
                    WhatsApp selected
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {data.page > 1 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={clientsHref(filters, { page: data.page - 1 })}
                      >
                        Previous
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                  )}
                  <Badge variant="outline" className="tabular-nums">
                    {data.page} / {totalPages}
                  </Badge>
                  {data.page < totalPages ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={clientsHref(filters, { page: data.page + 1 })}
                      >
                        Next
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </form>
    </div>
  );
}
