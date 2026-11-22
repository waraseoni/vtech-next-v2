"use client";

import { ArrowRight, ExternalLink, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setJobStatusAction } from "@/app/(app)/jobs/actions";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { WaPreviewModal } from "@/components/jobs/wa-preview-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";
import { formatIST, nowISTDateTimeLocal } from "@/lib/date";
import { formatINR } from "@/lib/money";

export type JobPreviewData = {
  id: number;
  jobId: string | null;
  code: string | null;
  item: string;
  fault: string;
  amount: number;
  status: number;
  clientName: string;
  clientContact: string;
  mechanicName: string;
  brandName: string | null;
  serviceTypeName: string | null;
  spot: string | null;
  dateCreated: string;
};

function fmtDate(value: string): string {
  return formatIST(value, { day: "2-digit", month: "short", year: "numeric" });
}

/** v1 `?preview=<id>` master-detail UX, rebuilt as a modern v2 drawer. */
export function JobPreviewPanel({ job }: { job: JobPreviewData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [waOpen, setWaOpen] = useState(false);

  const forward = isJobStatus(job.status)
    ? JOB_STATUS_TRANSITIONS[job.status].find((status) => status !== 4)
    : undefined;
  const phone = job.clientContact.replace(/\D/g, "");
  const message = [
    `Namaste ${job.clientName},`,
    "",
    `Job #${job.jobId ?? job.id} (${job.code ?? "—"}) ki status: ${isJobStatus(job.status) ? JOB_STATUS_LABELS[job.status] : job.status}.`,
    `Item: ${job.item}`,
    `Amount: ${formatINR(job.amount)}`,
    "",
    "Dhanyavaad.",
  ].join("\n");

  function close() {
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  function advance(status: JobStatus) {
    startTransition(async () => {
      const result = await setJobStatusAction({
        id: job.id,
        status,
        dateCompleted: status === 5 ? nowISTDateTimeLocal() : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${JOB_STATUS_LABELS[status]} ho gaya.`);
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex justify-end bg-black/50 print:hidden"
        role="presentation"
        onClick={close}
      >
        <aside
          className="bg-background h-full w-full max-w-xl space-y-4 overflow-y-auto border-l p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label={`Job ${job.jobId ?? job.id} preview`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  Job #{job.jobId ?? job.id}
                </h3>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {job.code} · {fmtDate(job.dateCreated)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close preview"
              onClick={close}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.brandName ? (
              <Badge variant="outline">{job.brandName}</Badge>
            ) : null}
            {job.serviceTypeName ? (
              <Badge variant="secondary">{job.serviceTypeName}</Badge>
            ) : null}
            {job.spot ? (
              <Badge variant="outline">
                <MapPin className="mr-1 size-3" aria-hidden />
                {job.spot}
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-1 rounded-lg border p-3 text-sm">
            <p className="font-medium">{job.item}</p>
            <p className="text-muted-foreground">{job.fault}</p>
            <div className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-xs">
              <span>{job.clientName}</span>
              <span>{job.mechanicName}</span>
            </div>
            <p className="mt-2 text-right text-base font-semibold tabular-nums">
              {formatINR(job.amount)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {forward ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => advance(forward)}
              >
                {JOB_STATUS_LABELS[forward]}
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setWaOpen(true)}
            >
              WhatsApp
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/jobs/${job.id}`}>
                Full view
                <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/jobs/${job.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </aside>
      </div>

      {waOpen ? (
        <WaPreviewModal
          title="Job status message"
          initialMessage={message}
          phone={phone}
          onClose={() => setWaOpen(false)}
        />
      ) : null}
    </>
  );
}
