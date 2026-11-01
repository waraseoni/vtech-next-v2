import { Plus, ReceiptIndianRupee, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSalesPage } from "@/lib/data/sales";
import { formatIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Sales" };

const PAGE_SIZE = 25;

type SalesSearch = {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
};

function salesHref(params: SalesSearch): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/sales?${query}` : "/sales";
}

function fmtDate(value: string): string {
  return formatIST(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const data = await getSalesPage({
    search: q,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = start + data.rows.length - 1;
  const filtered = Boolean(q || from || to);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Counter sales</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Sales</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Direct product sales, item-wise billing.
          </p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="size-4" aria-hidden />
            New sale
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>
                {filtered ? "Matching sales" : "Total sales"}
              </CardDescription>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("en-IN").format(data.total)}
              </p>
            </div>
            <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
              <ReceiptIndianRupee className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>Is page ka total</CardDescription>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatINR(data.pageTotal, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <span className="bg-success/10 text-success grid size-9 place-items-center rounded-lg">
              <ReceiptIndianRupee className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-3">
          <form
            action="/sales"
            method="get"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_auto] lg:items-end"
          >
            <div className="grid gap-1.5">
              <label
                htmlFor="sales-q"
                className="text-muted-foreground text-xs"
              >
                Search
              </label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="sales-q"
                  name="q"
                  defaultValue={q}
                  maxLength={60}
                  placeholder="Sale code, client ya remarks"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="sales-from"
                className="text-muted-foreground text-xs"
              >
                From
              </label>
              <Input
                id="sales-from"
                type="date"
                name="from"
                defaultValue={from}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="sales-to"
                className="text-muted-foreground text-xs"
              >
                To
              </label>
              <Input id="sales-to" type="date" name="to" defaultValue={to} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              {filtered ? (
                <Button asChild variant="ghost">
                  <Link href="/sales">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        {data.rows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-16 text-center">
            <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
              <ReceiptIndianRupee className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Koi sale nahi mili</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Filter badlein ya nayi sale banayein.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/sales/new">New sale</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {data.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/sales/${row.id}`}
                    className="hover:bg-muted/50 block px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.saleCode}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {row.clientName} · {fmtDate(row.dateCreated)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatINR(row.totalAmount, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{row.paymentMode}</Badge>
                      {row.remarks ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {row.remarks}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                    <th className="px-5 py-3 font-medium">Sale</th>
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Mode</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">
                      Remarks
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/sales/${row.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.saleCode}
                        </Link>
                      </td>
                      <td className="max-w-48 px-3 py-3">
                        {row.clientId ? (
                          <Link
                            href={`/clients/${row.clientId}`}
                            className="block truncate hover:underline"
                          >
                            {row.clientName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{row.paymentMode}</Badge>
                      </td>
                      <td className="text-muted-foreground hidden max-w-56 truncate px-3 py-3 text-xs lg:table-cell">
                        {row.remarks || "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(row.totalAmount, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {fmtDate(row.dateCreated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing{" "}
                <span className="text-foreground font-medium">
                  {start}–{end}
                </span>{" "}
                of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild={data.page > 1}
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                >
                  {data.page > 1 ? (
                    <Link
                      href={salesHref({
                        q,
                        from,
                        to,
                        page: data.page - 1,
                      })}
                    >
                      Previous
                    </Link>
                  ) : (
                    "Previous"
                  )}
                </Button>
                <Badge variant="outline" className="tabular-nums">
                  {data.page} / {totalPages}
                </Badge>
                <Button
                  asChild={data.page < totalPages}
                  variant="outline"
                  size="sm"
                  disabled={data.page >= totalPages}
                >
                  {data.page < totalPages ? (
                    <Link
                      href={salesHref({
                        q,
                        from,
                        to,
                        page: data.page + 1,
                      })}
                    >
                      Next
                    </Link>
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
