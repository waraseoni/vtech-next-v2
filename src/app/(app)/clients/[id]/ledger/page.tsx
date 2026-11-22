import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintClientsButton } from "@/components/clients/print-clients-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getClientLedger } from "@/lib/data/client-ledger";
import type { LedgerFilter } from "@/lib/domain/client-ledger";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Client ledger" };

const FILTERS: Array<{ value: LedgerFilter; label: string }> = [
  { value: "all", label: "All entries" },
  { value: "repairs", label: "Repairs" },
  { value: "sales", label: "Direct sales" },
  { value: "loans", label: "Loans" },
  { value: "payments", label: "Payments" },
];

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function ClientLedgerPage({
  params,
  searchParams,
}: PageProps<"/clients/[id]/ledger">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const search = await searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(search.from))
    ? str(search.from)
    : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(search.to)) ? str(search.to) : "";
  const filterParam = str(search.filter);
  const filter: LedgerFilter = FILTERS.some((row) => row.value === filterParam)
    ? (filterParam as LedgerFilter)
    : "all";

  const data = await getClientLedger(clientId, { from, to, filter });
  if (!data) notFound();

  const { client, statement } = data;
  const name = [client.firstname, client.middlename, client.lastname]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="size-4" aria-hidden />
            {name}
          </Link>
        </Button>
        <PrintClientsButton />
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ledger</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {name} · #{client.id} · {client.contact}
        </p>
      </div>

      <Card className="gap-0 py-0 print:hidden">
        <CardContent className="px-4 py-3">
          <form
            action={`/clients/${clientId}/ledger`}
            method="get"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="grid gap-1">
              <Label htmlFor="from" className="text-xs">
                From
              </Label>
              <Input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="to" className="text-xs">
                To
              </Label>
              <Input id="to" name="to" type="date" defaultValue={to} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="filter" className="text-xs">
                Show
              </Label>
              <Select
                id="filter"
                name="filter"
                defaultValue={filter}
                className="w-40"
              >
                {FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
            {from || to || filter !== "all" ? (
              <Button asChild variant="ghost">
                <Link href={`/clients/${clientId}/ledger`}>Clear</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <CardDescription>Debit</CardDescription>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatINR(statement.totals.debit)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <CardDescription>Credit</CardDescription>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatINR(statement.totals.credit)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <CardDescription>Closing balance</CardDescription>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatINR(statement.totals.closing)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="px-5 py-3 print:hidden">
          <CardTitle className="text-base">Statement</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground border-y text-left text-xs">
                <th className="px-5 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Particulars</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  Reference
                </th>
                <th className="px-3 py-2 text-right font-medium">Debit</th>
                <th className="px-3 py-2 text-right font-medium">Credit</th>
                <th className="px-5 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {statement.broughtForward !== 0 ? (
                <tr className="border-b">
                  <td className="px-5 py-2">—</td>
                  <td className="px-3 py-2">Brought forward</td>
                  <td className="hidden px-3 py-2 sm:table-cell" />
                  <td className="px-3 py-2 text-right" />
                  <td className="px-3 py-2 text-right" />
                  <td className="px-5 py-2 text-right font-medium tabular-nums">
                    {formatINR(statement.broughtForward)}
                  </td>
                </tr>
              ) : null}
              {statement.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground px-5 py-10 text-center text-sm"
                  >
                    Is range me koi entry nahi hai.
                  </td>
                </tr>
              ) : (
                statement.rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="px-5 py-2 whitespace-nowrap tabular-nums">
                      {row.kind === "opening" ? "Opening" : row.date}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{row.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {row.kind}
                        </Badge>
                      </div>
                      {row.discount ? (
                        <p className="text-muted-foreground text-xs">
                          Discount {formatINR(row.discount)} included in credit
                        </p>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-2 text-xs sm:table-cell">
                      {row.reference ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.debit ? formatINR(row.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.credit ? formatINR(row.credit) : "—"}
                    </td>
                    <td className="px-5 py-2 text-right font-medium tabular-nums">
                      {formatINR(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
