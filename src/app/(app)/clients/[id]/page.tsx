import {
  ArrowLeft,
  ArrowUpRight,
  HandCoins,
  Landmark,
  MessageCircle,
  Pencil,
  Phone,
  ReceiptIndianRupee,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientAvatar } from "@/components/clients/client-avatar";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isStaffRole, requireSession } from "@/lib/auth";
import { getClientDetail } from "@/lib/data/clients";
import { formatIST } from "@/lib/date";
import {
  resolveClientPhotoUrl,
  telHref,
  whatsAppHref,
} from "@/lib/domain/client";
import { getPublicEnv } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Client" };

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+05:30`
    : value;
  return formatIST(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mx-5 rounded-lg border border-dashed p-4 text-sm">
      {children}
    </p>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <CardDescription>{label}</CardDescription>
          <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {hint}
          </p>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            tone,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const [session, detail] = await Promise.all([
    requireSession(),
    getClientDetail(clientId),
  ]);
  if (!detail) notFound();

  const { client, balance, finance, contacts, jobs, payments, sales, loans } =
    detail;
  const photoUrl = resolveClientPhotoUrl(client.image_path, getPublicEnv().url);
  const tel = telHref(client.contact);
  const whatsapp = whatsAppHref(
    client.contact,
    `Namaste ${client.firstname}, V-Tech se.`,
  );
  const canDelete =
    isStaffRole(session.profile.role) &&
    (session.profile.role === "admin" || session.profile.role === "developer");
  const dueLabel = balance.due < 0 ? "Advance" : "Due";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/clients">
          <ArrowLeft className="size-4" aria-hidden />
          All clients
        </Link>
      </Button>

      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-start">
          <ClientAvatar name={client.name} src={photoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {client.name}
              </h2>
              <Badge variant="outline">Client #{client.id}</Badge>
              {balance.due > 0 ? (
                <Badge variant="warning">
                  Due {formatINR(balance.due, { maximumFractionDigits: 0 })}
                </Badge>
              ) : (
                <Badge variant="success">Settled</Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {tel ? (
                <a
                  href={tel}
                  className="hover:text-foreground flex items-center gap-1.5"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {client.contact}
                </a>
              ) : (
                <span>{client.contact}</span>
              )}
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="hover:text-foreground"
                >
                  {client.email}
                </a>
              ) : null}
              <span>{client.address}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {whatsapp ? (
              <Button asChild size="sm" variant="outline">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open WhatsApp"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href={`/clients/${client.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                Edit
              </Link>
            </Button>
            {canDelete ? (
              <DeleteClientButton id={client.id} name={client.name} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {client.payment_due_date && balance.due > 0 ? (
        <div className="border-warning/30 bg-warning/10 rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">
            Payment due {fmtDate(client.payment_due_date)}
          </p>
          {client.payment_due_remarks ? (
            <p className="text-muted-foreground mt-1">
              {client.payment_due_remarks}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total billed"
          value={formatINR(balance.billed, { maximumFractionDigits: 0 })}
          hint={`Opening ${formatINR(client.opening_balance, { maximumFractionDigits: 0 })}`}
          icon={ReceiptIndianRupee}
          tone="bg-primary/10 text-primary"
        />
        <Kpi
          label="Paid"
          value={formatINR(balance.paid, { maximumFractionDigits: 0 })}
          hint={`${payments.length >= 25 ? "25+" : payments.length} recent entries`}
          icon={Wallet}
          tone="bg-success/10 text-success"
        />
        <Kpi
          label={dueLabel}
          value={formatINR(Math.abs(balance.due), {
            maximumFractionDigits: 0,
          })}
          hint={
            client.payment_due_date
              ? `Due ${fmtDate(client.payment_due_date)}`
              : "No due date set"
          }
          icon={HandCoins}
          tone={
            balance.due > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success"
          }
        />
        <Kpi
          label="Active loan"
          value={formatINR(finance?.active_loan_given, {
            maximumFractionDigits: 0,
          })}
          hint={`Repaid ${formatINR(finance?.loan_repaid, { maximumFractionDigits: 0 })}`}
          icon={Landmark}
          tone="bg-warning/10 text-warning"
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <Card className="gap-4 py-5">
            <CardHeader className="flex-row items-start justify-between gap-2 px-5">
              <div>
                <CardDescription>Service history</CardDescription>
                <CardTitle className="mt-1 text-lg">Jobs</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/jobs">
                  All jobs
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              {jobs.length === 0 ? (
                <Empty>Is client ka koi job record nahi hai.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-y text-left text-xs">
                        <th className="px-5 py-2 font-medium">Job</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr
                          key={job.id}
                          className="hover:bg-muted/40 border-b last:border-0"
                        >
                          <td className="px-5 py-2.5">
                            <p className="font-mono text-xs font-medium">
                              #{job.job_id ?? job.code}
                            </p>
                            <p className="text-muted-foreground max-w-56 truncate text-xs">
                              {job.item}
                              {job.fault ? ` · ${job.fault}` : ""}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {fmtDate(job.date_created)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                            {formatINR(job.amount, {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>Ledger</CardDescription>
              <CardTitle className="mt-1 text-lg">Payments</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {payments.length === 0 ? (
                <Empty>Abhi koi payment record nahi hai.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-y text-left text-xs">
                        <th className="px-5 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Mode</th>
                        <th className="hidden px-3 py-2 font-medium sm:table-cell">
                          Type
                        </th>
                        <th className="px-5 py-2 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const net =
                          payment.net_amount ??
                          payment.amount - (payment.discount ?? 0);
                        return (
                          <tr
                            key={payment.id}
                            className="hover:bg-muted/40 border-b last:border-0"
                          >
                            <td className="px-5 py-2.5">
                              <p>{fmtDate(payment.payment_date)}</p>
                              <p className="text-muted-foreground text-xs">
                                {payment.bill_no ?? payment.job_id ?? "—"}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline">
                                {payment.payment_mode ?? "Cash"}
                              </Badge>
                            </td>
                            <td className="text-muted-foreground hidden px-3 py-2.5 text-xs sm:table-cell">
                              {payment.payment_type ?? "Full"}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <p className="font-medium tabular-nums">
                                {formatINR(net, {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                              {payment.discount ? (
                                <p className="text-muted-foreground text-xs">
                                  −
                                  {formatINR(payment.discount, {
                                    maximumFractionDigits: 0,
                                  })}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>Counter sales</CardDescription>
              <CardTitle className="mt-1 text-lg">Direct sales</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {sales.length === 0 ? (
                <Empty>Koi direct sale record nahi hai.</Empty>
              ) : (
                <ul className="divide-y">
                  {sales.map((sale) => (
                    <li
                      key={sale.id}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium">
                          {sale.sale_code}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {fmtDate(sale.date_created)}
                          {sale.remarks ? ` · ${sale.remarks}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">
                          {sale.payment_mode ?? "Cash"}
                        </Badge>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatINR(sale.total_amount, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>Reach out</CardDescription>
              <CardTitle className="mt-1 text-lg">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-5">
              {contacts.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                  Sirf primary contact: {client.contact}
                </p>
              ) : (
                <ul className="space-y-1">
                  {contacts.map((contact) => {
                    const contactTel = telHref(contact.phone);
                    return (
                      <li
                        key={contact.id}
                        className="hover:bg-muted/60 flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">
                              {contact.name ?? contact.label}
                            </p>
                            {contact.is_primary ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Primary
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {contact.label}
                          </p>
                        </div>
                        {contactTel ? (
                          <a
                            href={contactTel}
                            className="flex shrink-0 items-center gap-1 text-sm tabular-nums hover:underline"
                          >
                            <Phone className="size-3.5" aria-hidden />
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-sm">{contact.phone}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>Financials</CardDescription>
              <CardTitle className="mt-1 text-lg">Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-5 text-sm">
              {[
                ["Opening balance", client.opening_balance],
                ["Repair billed", finance?.repair_billed],
                ["Direct sales", finance?.direct_sales_billed],
                ["Service paid", finance?.service_paid],
                ["Active loan given", finance?.active_loan_given],
                ["Loan repaid", finance?.loan_repaid],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">
                    {formatINR(value, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2">
                <span className="font-medium">Balance</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    balance.due > 0 && "text-destructive",
                    balance.due < 0 && "text-success",
                  )}
                >
                  {formatINR(balance.due, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>Financing</CardDescription>
              <CardTitle className="mt-1 text-lg">Loans</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {loans.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                  Koi loan record nahi hai.
                </p>
              ) : (
                <ul className="space-y-2">
                  {loans.map((loan) => (
                    <li
                      key={loan.id}
                      className="rounded-lg border px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium tabular-nums">
                          {formatINR(loan.principal_amount, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <Badge
                          variant={loan.status === 1 ? "success" : "secondary"}
                        >
                          {loan.status === 1 ? "Active" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {fmtDate(loan.loan_date)} · EMI{" "}
                        {formatINR(loan.emi_amount, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        × {loan.loan_period}
                      </p>
                      {loan.remarks ? (
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          {loan.remarks}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="gap-2 py-4">
            <CardContent className="text-muted-foreground px-5 text-xs">
              <p className="flex items-center gap-1.5">
                <Wrench className="size-3.5" aria-hidden />
                Created {fmtDate(client.date_created)}
              </p>
              <p className="mt-1">
                Last updated {fmtDate(client.date_updated)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
