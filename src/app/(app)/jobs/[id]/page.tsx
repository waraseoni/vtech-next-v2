import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  Pencil,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { JobImages } from "@/components/jobs/job-images";
import { JobStatusActions } from "@/components/jobs/job-status-actions";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { PrintJobButton } from "@/components/jobs/print-job-button";
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
import { getJobDetail } from "@/lib/data/jobs";
import { resolveMediaUrl } from "@/lib/data/storage";
import { formatIST } from "@/lib/date";
import { getPublicEnv } from "@/lib/env";
import { formatINR, lineTotal, sumMoney } from "@/lib/money";
import { canDeleteRecords } from "@/lib/roles";

export const metadata = { title: "Job" };

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return formatIST(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function JobDetailPage({
  params,
}: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) notFound();

  const [session, detail] = await Promise.all([
    requireSession(),
    getJobDetail(jobId),
  ]);
  if (!detail) notFound();

  const { job, services, products, images } = detail;
  const supabaseUrl = getPublicEnv().url;
  const imageUrls = images
    .map((image) => ({
      id: image.id,
      url: resolveMediaUrl(image.image_path, supabaseUrl) ?? "",
    }))
    .filter((image) => image.url);
  const serviceTotal = sumMoney(services.map((line) => line.price));
  const productTotal = sumMoney(
    products.map((line) => lineTotal(line.qty, line.price)),
  );
  const canDelete = canDeleteRecords(session.profile.role);

  const steps = [
    { status: 0, label: "Created", date: job.date_created },
    { status: 1, label: "In progress", date: null },
    { status: 2, label: "Finished", date: job.date_completed },
    { status: 3, label: "Paid", date: null },
    { status: 5, label: "Delivered", date: null },
  ];
  const currentIndex = steps.findIndex((step) => step.status === job.status);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link href="/jobs">
              <ArrowLeft className="size-4" aria-hidden />
              Jobsheet
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Job {job.job_id ? `#${job.job_id}` : `#${job.id}`}
            </h2>
            <JobStatusBadge status={job.status} />
            <Badge variant="outline">{job.code}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {job.item} · {fmtDateTime(job.date_created)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintJobButton />
          <Button asChild variant="outline" size="sm">
            <Link href={`/jobs/${job.id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
          </Button>
          {canDelete ? <DeleteJobButton jobId={job.id} /> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Job card</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs">Client</p>
                {job.clientId ? (
                  <Link
                    href={`/clients/${job.clientId}`}
                    className="mt-1 block font-medium hover:underline"
                  >
                    {job.clientName}
                  </Link>
                ) : (
                  <p className="mt-1 font-medium">Walk-in</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Mechanic</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  <User
                    className="text-muted-foreground size-3.5"
                    aria-hidden
                  />
                  {job.mechanicName}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs">Fault</p>
                <p className="mt-1 text-sm whitespace-pre-line">{job.fault}</p>
              </div>
              {job.remark ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs">Remark</p>
                  <p className="mt-1 text-sm whitespace-pre-line">
                    {job.remark}
                  </p>
                </div>
              ) : null}
              {job.uniq_id ? (
                <div>
                  <p className="text-muted-foreground text-xs">Spot</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <MapPin
                      className="text-muted-foreground size-3.5"
                      aria-hidden
                    />
                    {job.uniq_id}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs">Commission</p>
                <p className="mt-1 text-sm tabular-nums">
                  {formatINR(
                    job.mechanic_commission_amount ?? job.mechanic_amount,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle>Services & parts</CardTitle>
              <CardDescription>
                Services {formatINR(serviceTotal)} · Parts{" "}
                {formatINR(productTotal)}
              </CardDescription>
            </CardHeader>
            {services.length === 0 && products.length === 0 ? (
              <p className="text-muted-foreground px-5 py-6 text-sm">
                Koi line item nahi.
              </p>
            ) : (
              <div className="divide-y">
                {services.map((line, index) => (
                  <div
                    key={`s-${line.service_id}-${index}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                  >
                    <span>
                      {line.service_name || `Service #${line.service_id}`}
                      <span className="text-muted-foreground"> · service</span>
                    </span>
                    <span className="tabular-nums">
                      {formatINR(line.price)}
                    </span>
                  </div>
                ))}
                {products.map((line) => (
                  <div
                    key={`p-${line.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {line.product_name || `Product #${line.product_id}`}
                      <span className="text-muted-foreground">
                        {" "}
                        × {line.qty}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {formatINR(lineTotal(line.qty, line.price))}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-muted/40 flex items-center justify-between border-t px-5 py-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(job.amount)}</span>
            </div>
          </Card>

          <Card className="gap-4 py-5 print:hidden">
            <CardHeader className="px-5">
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                Job images public media bucket me store hoti hain.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <JobImages jobId={job.id} images={imageUrls} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="gap-4 py-5 print:hidden">
            <CardHeader className="px-5">
              <CardTitle>Next step</CardTitle>
              <CardDescription>Status flow forward-only hai.</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <JobStatusActions jobId={job.id} status={job.status} />
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              {job.status === 4 ? (
                <p className="text-destructive text-sm">
                  Ye job cancelled hai.
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {steps.map((step, index) => {
                    const done = currentIndex >= 0 && index <= currentIndex;
                    return (
                      <li
                        key={step.status}
                        className="flex items-start gap-2.5"
                      >
                        <span
                          className={
                            done
                              ? "bg-primary mt-1 size-2.5 shrink-0 rounded-full"
                              : "bg-muted mt-1 size-2.5 shrink-0 rounded-full"
                          }
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p
                            className={
                              done
                                ? "text-sm font-medium"
                                : "text-muted-foreground text-sm"
                            }
                          >
                            {step.label}
                          </p>
                          {step.date ? (
                            <p className="text-muted-foreground text-xs">
                              {fmtDateTime(step.date)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="text-muted-foreground space-y-1 border-t pt-3 text-xs">
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  Updated {fmtDateTime(job.date_updated)}
                </p>
                {job.date_completed ? (
                  <p>Completed {fmtDateTime(job.date_completed)}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-5 text-sm print:hidden">
              {job.clientId ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Link href={`/clients/${job.clientId}`}>
                    <Wrench className="size-4" aria-hidden />
                    Client profile
                  </Link>
                </Button>
              ) : null}
              {isStaffRole(session.profile.role) ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Link href="/jobs/new">
                    <Wrench className="size-4" aria-hidden />
                    New job
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
