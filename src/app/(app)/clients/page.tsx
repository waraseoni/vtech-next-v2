import {
  AlertTriangle,
  ChevronRight,
  IndianRupee,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientsPage } from "@/lib/data/clients";
import { formatIST } from "@/lib/date";
import { clientInitials } from "@/lib/domain/client";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Clients" };

const PAGE_SIZE = 25;

function clientsHref(params: {
  q?: string;
  due?: boolean;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.due) search.set("due", "1");
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/clients?${query}` : "/clients";
}

export default async function ClientsPage({
  searchParams,
}: PageProps<"/clients">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const dueOnly = params.due === "1";
  const requestedPage =
    typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const data = await getClientsPage({
    search: q,
    dueOnly,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = start + data.rows.length - 1;
  const filtered = Boolean(q) || dueOnly;

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
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="size-4" aria-hidden />
            New client
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <form
            action="/clients"
            method="get"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            {dueOnly ? <input type="hidden" name="due" value="1" /> : null}
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={q}
                maxLength={60}
                placeholder="Name, phone ya address search karein"
                aria-label="Search clients"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Button asChild variant={dueOnly ? "default" : "outline"} size="sm">
              <Link href={clientsHref({ q, due: !dueOnly })}>Due only</Link>
            </Button>
            {filtered ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/clients">Clear</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

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
                <li key={row.id}>
                  <Link
                    href={`/clients/${row.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3"
                  >
                    <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {clientInitials(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {row.contact}
                        {row.address ? ` · ${row.address}` : ""}
                      </p>
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
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">
                      Address
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Billed</th>
                    <th className="px-3 py-3 text-right font-medium">Paid</th>
                    <th className="px-3 py-3 text-right font-medium">Due</th>
                    <th className="hidden px-3 py-3 font-medium xl:table-cell">
                      Last txn
                    </th>
                    <th className="w-10 px-3 py-3">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-5 py-3">
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
                      <td className="hidden max-w-64 px-3 py-3 lg:table-cell">
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
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/clients/${row.id}`}
                          aria-label={`Open ${row.name}`}
                          className="text-muted-foreground hover:bg-muted grid size-8 place-items-center rounded-md"
                        >
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
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
                {data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={clientsHref({
                        q,
                        due: dueOnly,
                        page: data.page - 1,
                      })}
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
                      href={clientsHref({
                        q,
                        due: dueOnly,
                        page: data.page + 1,
                      })}
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
    </div>
  );
}
