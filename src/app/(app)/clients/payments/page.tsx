import { ArrowLeft, ReceiptIndianRupee } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getPaymentReport } from "@/lib/data/client-payments";
import { getClientNames } from "@/lib/data/clients";
import { formatIST } from "@/lib/date";
import { PAYMENT_MODES } from "@/lib/data/payment-input";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Payment report" };

const PAGE_SIZE = 50;

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

function reportHref(params: {
  from?: string;
  to?: string;
  mode?: string;
  client?: string;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.mode) search.set("mode", params.mode);
  if (params.client) search.set("client", params.client);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/clients/payments?${query}` : "/clients/payments";
}

export default async function PaymentReportPage({
  searchParams,
}: PageProps<"/clients/payments">) {
  const params = await searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(params.from))
    ? str(params.from)
    : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(params.to)) ? str(params.to) : "";
  const modeParam = str(params.mode);
  const mode = (PAYMENT_MODES as readonly string[]).includes(modeParam)
    ? (modeParam as (typeof PAYMENT_MODES)[number])
    : "";
  const clientParam = str(params.client);
  const clientId = /^\d+$/.test(clientParam) ? Number(clientParam) : undefined;
  const requestedPage = Number(str(params.page));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const report = await getPaymentReport({
    from,
    to,
    mode,
    clientId,
    page,
    pageSize: PAGE_SIZE,
  });
  const names = await getClientNames(report.rows.map((row) => row.client_id));
  const totalPages = Math.max(1, Math.ceil(report.total / report.pageSize));
  const filtered = Boolean(from || to || mode || clientId);
  const pageNet = report.rows.reduce(
    (sum, row) => sum + (row.net_amount ?? row.amount - (row.discount ?? 0)),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/clients">
            <ArrowLeft className="size-4" aria-hidden />
            Clients
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">
          Payment report
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Date range, mode ya client se payments filter karein.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div>
              <CardDescription>Payments</CardDescription>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {report.total}
              </p>
            </div>
            <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
              <ReceiptIndianRupee className="size-4" aria-hidden />
            </span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <CardDescription>Net on this page</CardDescription>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatINR(pageNet, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <CardDescription>Range</CardDescription>
            <p className="mt-1 text-sm font-medium">
              {from || "Start"} → {to || "Today"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-3">
          <form
            action="/clients/payments"
            method="get"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="grid gap-1">
              <Label htmlFor="pay-from" className="text-xs">
                From
              </Label>
              <Input
                id="pay-from"
                name="from"
                type="date"
                defaultValue={from}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pay-to" className="text-xs">
                To
              </Label>
              <Input id="pay-to" name="to" type="date" defaultValue={to} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pay-mode" className="text-xs">
                Mode
              </Label>
              <Select
                id="pay-mode"
                name="mode"
                defaultValue={mode}
                className="w-40"
              >
                <option value="">All modes</option>
                {PAYMENT_MODES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pay-client" className="text-xs">
                Client id
              </Label>
              <Input
                id="pay-client"
                name="client"
                inputMode="numeric"
                defaultValue={clientId ?? ""}
                className="w-28"
              />
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
            {filtered ? (
              <Button asChild variant="ghost">
                <Link href="/clients/payments">Clear</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        {report.rows.length === 0 ? (
          <p className="text-muted-foreground px-5 py-12 text-center text-sm">
            Is filter par koi payment nahi mila.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Mode</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">
                      Type
                    </th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">
                      Reference
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Discount
                    </th>
                    <th className="px-5 py-3 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => {
                    const net =
                      row.net_amount ?? row.amount - (row.discount ?? 0);
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/40 border-b last:border-0"
                      >
                        <td className="px-5 py-3 text-xs whitespace-nowrap">
                          {fmtDate(row.payment_date)}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/clients/${row.client_id}`}
                            className="font-medium hover:underline"
                          >
                            {names.get(row.client_id) ??
                              `Client #${row.client_id}`}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline">
                            {row.payment_mode ?? "Cash"}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground hidden px-3 py-3 text-xs md:table-cell">
                          {row.payment_type ?? "Full"}
                          {row.loan_id ? ` · Loan #${row.loan_id}` : ""}
                        </td>
                        <td className="text-muted-foreground hidden px-3 py-3 text-xs lg:table-cell">
                          {row.bill_no ?? row.job_id ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatINR(row.amount, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-muted-foreground px-3 py-3 text-right tabular-nums">
                          {row.discount
                            ? formatINR(row.discount, {
                                maximumFractionDigits: 0,
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          {formatINR(net, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">{report.total} entries</p>
              <div className="flex items-center gap-2">
                {report.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={reportHref({
                        from,
                        to,
                        mode,
                        client: clientId ? String(clientId) : "",
                        page: report.page - 1,
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
                  {report.page} / {totalPages}
                </Badge>
                {report.page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={reportHref({
                        from,
                        to,
                        mode,
                        client: clientId ? String(clientId) : "",
                        page: report.page + 1,
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
