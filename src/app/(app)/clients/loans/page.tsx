import { ArrowLeft, ArrowUpRight, Landmark } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LiveSearchInput } from "@/components/ui/live-search-input";
import { Select } from "@/components/ui/select";
import { getLoanRegister } from "@/lib/data/client-loans";
import { formatIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Loan register" };

const PAGE_SIZE = 25;

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return formatIST(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value,
    { day: "2-digit", month: "short", year: "numeric" },
  );
}

function registerHref(params: {
  q?: string;
  status?: string;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/clients/loans?${query}` : "/clients/loans";
}

export default async function LoanRegisterPage({
  searchParams,
}: PageProps<"/clients/loans">) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const statusParam = str(params.status);
  const status: "active" | "closed" | "all" =
    statusParam === "active" || statusParam === "closed" ? statusParam : "all";
  const requestedPage = Number(str(params.page));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const data = await getLoanRegister({
    search: q,
    status,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/clients">
              <ArrowLeft className="size-4" aria-hidden />
              Clients
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight">
            Loan register
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Sabhi client loans, repaid aur balance ek jagah.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Principal", value: data.totals.principal, icon: Landmark },
          {
            label: "Total payable",
            value: data.totals.payable,
            icon: Landmark,
          },
          { label: "Repaid", value: data.totals.repaid, icon: Landmark },
          { label: "Outstanding", value: data.totals.balance, icon: Landmark },
        ].map((kpi) => (
          <Card key={kpi.label} className="gap-2 py-4">
            <CardContent className="flex items-center justify-between gap-3 px-4">
              <div>
                <CardDescription>{kpi.label}</CardDescription>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatINR(kpi.value, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <span className="bg-warning/10 text-warning grid size-9 place-items-center rounded-lg">
                <kpi.icon className="size-4" aria-hidden />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-3">
          <form
            action="/clients/loans"
            method="get"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-0 flex-1">
              <Label htmlFor="loan-search" className="sr-only">
                Search loans
              </Label>
              <LiveSearchInput
                id="loan-search"
                defaultValue={q}
                placeholder="Client name, loan id ya amount"
                ariaLabel="Search loans"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="loan-status" className="text-xs">
                Status
              </Label>
              <Select
                id="loan-status"
                name="status"
                defaultValue={status}
                className="w-36"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {q || status !== "all" ? (
              <Button asChild variant="ghost">
                <Link href="/clients/loans">Clear</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        {data.rows.length === 0 ? (
          <p className="text-muted-foreground px-5 py-12 text-center text-sm">
            Koi loan record nahi mila.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                    <th className="px-5 py-3 font-medium">Loan</th>
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Principal
                    </th>
                    <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                      Total
                    </th>
                    <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                      EMI
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Repaid</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Balance
                    </th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((loan) => (
                    <tr
                      key={loan.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-5 py-3 font-mono text-xs">
                        LN-{String(loan.id).padStart(5, "0")}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/clients/${loan.client_id}`}
                          className="font-medium hover:underline"
                        >
                          {loan.clientName}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {fmtDate(loan.loan_date)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(loan.principal_amount, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
                        {formatINR(loan.total_payable, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
                        {formatINR(loan.emi_amount, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(loan.repaid, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {formatINR(loan.balance, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              loan.status === 1 ? "success" : "secondary"
                            }
                          >
                            {loan.status === 1 ? "Active" : "Closed"}
                          </Badge>
                          {loan.status === 1 ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                href={`/clients/${loan.client_id}/loans/${loan.id}/emi`}
                              >
                                EMI
                                <ArrowUpRight
                                  className="size-3.5"
                                  aria-hidden
                                />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                {data.total} loan{data.total === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                {data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={registerHref({ q, status, page: data.page - 1 })}
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
                      href={registerHref({ q, status, page: data.page + 1 })}
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
