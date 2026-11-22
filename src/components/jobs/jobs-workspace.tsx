"use client";

import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  MessageCircle,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkMoveJobSpotAction,
  bulkSetJobStatusAction,
  setJobStatusAction,
} from "@/app/(app)/jobs/actions";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { WaPreviewModal } from "@/components/jobs/wa-preview-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";
import type { JobListItem } from "@/lib/data/jobs";
import type { JobSpot } from "@/lib/data/job-operations";
import { formatIST, nowISTDateTimeLocal } from "@/lib/date";
import { formatINR } from "@/lib/money";

function shortDate(value: string | null): string {
  if (!value) return "—";
  return formatIST(value, { day: "2-digit", month: "short" });
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function JobsWorkspace({
  rows,
  spots,
  canWrite,
  previewQuery,
}: {
  rows: JobListItem[];
  spots: JobSpot[];
  canWrite: boolean;
  previewQuery: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [showSpot, setShowSpot] = useState(false);
  const [spotId, setSpotId] = useState("");
  const [waMessage, setWaMessage] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  function previewHref(id: number): string {
    return `/jobs?${previewQuery ? `${previewQuery}&` : ""}preview=${id}`;
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function clear() {
    setSelected(new Set());
    setBulkStatus("");
    setShowSpot(false);
  }

  function applyStatus() {
    const status = Number(bulkStatus);
    if (!isJobStatus(status)) {
      toast.error("Naya status chuniye.");
      return;
    }
    startTransition(async () => {
      const result = await bulkSetJobStatusAction({
        ids: [...selected],
        status,
        dateCompleted: status === 5 && deliveryAt ? deliveryAt : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.updated} jobs update ho gaye.`);
      clear();
      router.refresh();
    });
  }

  function applySpot() {
    const spot = spots.find((item) => String(item.id) === spotId);
    startTransition(async () => {
      const result = await bulkMoveJobSpotAction({
        ids: [...selected],
        locationId: spot?.id ?? null,
        spot: spot?.label ?? "",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.updated} jobs move ho gaye.`);
      clear();
      router.refresh();
    });
  }

  function prepareWa() {
    if (!selectedRows.length) {
      toast.error("Pehle jobs chuniye.");
      return;
    }
    const groups = new Map<
      string,
      { phone: string; lines: string[]; total: number }
    >();
    for (const row of selectedRows) {
      const key = `${row.clientName}|${row.clientContact}`;
      const group = groups.get(key) ?? {
        phone: row.clientContact,
        lines: [],
        total: 0,
      };
      group.lines.push(
        `#${row.jobId ?? row.id} · ${row.item} · ${formatINR(row.amount)}`,
      );
      group.total += row.amount;
      groups.set(key, group);
    }
    const sections = [...groups.entries()].map(([key, group]) => {
      const client = key.split("|")[0];
      return [
        `${client}:`,
        ...group.lines,
        `Total: ${formatINR(group.total)}`,
      ].join("\n");
    });
    setWaPhone([...groups.values()][0]?.phone ?? "");
    setWaMessage(["Aapke jobs ka summary:", "", ...sections].join("\n\n"));
  }

  function exportCsv() {
    const header = [
      "Job ID",
      "Code",
      "Client",
      "Contact",
      "Item",
      "Fault",
      "Mechanic",
      "Amount",
      "Status",
      "Created",
    ];
    const lines = rows.map((row) =>
      [
        row.jobId,
        row.code,
        row.clientName,
        row.clientContact,
        row.item,
        row.fault,
        row.mechanicName,
        row.amount,
        isJobStatus(row.status) ? JOB_STATUS_LABELS[row.status] : row.status,
        row.dateCreated,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function quickStatus(row: JobListItem, status: JobStatus) {
    startTransition(async () => {
      const result = await setJobStatusAction({
        id: row.id,
        status,
        dateCompleted: status === 5 ? nowISTDateTimeLocal() : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Job #${row.jobId ?? row.id}: ${JOB_STATUS_LABELS[status]}`,
      );
      router.refresh();
    });
  }

  if (rows.length === 0) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="size-4" aria-hidden />
          Print
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" aria-hidden />
          Export
        </Button>
      </div>

      {canWrite && selected.size > 0 ? (
        <div className="bg-muted/40 mb-3 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 print:hidden">
          <Badge variant="default">{selected.size} selected</Badge>
          <Select
            aria-label="New status"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
            className="w-auto"
          >
            <option value="">-- New status --</option>
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {bulkStatus === "5" ? (
            <Input
              aria-label="Delivery date and time"
              type="datetime-local"
              value={deliveryAt}
              onChange={(event) => setDeliveryAt(event.target.value)}
              className="w-auto"
            />
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={applyStatus}
            disabled={pending}
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSpot(true)}
          >
            Move
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={prepareWa}>
            <MessageCircle className="size-4" aria-hidden />
            WA report
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`/jobs/combined-invoice?ids=${[...selected].join(",")}&bill_type=non_gst`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="size-4" aria-hidden />
              Estimate
            </a>
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        </div>
      ) : null}

      {showSpot ? (
        <Card className="mb-3 gap-3 p-3 print:hidden">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid min-w-48 flex-1 gap-2">
              <Label htmlFor="bulk-spot">Naya spot / ya clear karein</Label>
              <Select
                id="bulk-spot"
                value={spotId}
                onChange={(event) => setSpotId(event.target.value)}
              >
                <option value="">Spot hatao (clear)</option>
                {spots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.label} ({spot.occupied} job)
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={applySpot}
              disabled={pending}
            >
              Move {selected.size} jobs
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowSpot(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <ul className="divide-y md:hidden">
        {rows.map((row) => {
          const forward = isJobStatus(row.status)
            ? JOB_STATUS_TRANSITIONS[row.status].find((status) => status !== 4)
            : undefined;
          return (
            <li key={row.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {canWrite ? (
                  <input
                    type="checkbox"
                    aria-label={`Select job ${row.jobId ?? row.id}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="accent-primary mt-1 size-4"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${row.id}`} className="block">
                    <div className="mb-1 flex flex-wrap gap-1">
                      {row.brandName ? (
                        <Badge variant="outline">{row.brandName}</Badge>
                      ) : null}
                      {row.serviceTypeName ? (
                        <Badge variant="secondary">{row.serviceTypeName}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm font-medium">{row.item}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {row.clientName} · {row.code}
                    </p>
                  </Link>
                  <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                    <span>
                      {row.mechanicName} · {shortDate(row.dateCreated)}
                    </span>
                    <span className="text-foreground font-semibold tabular-nums">
                      {formatINR(row.amount, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={row.status} />
                    {canWrite && forward ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => quickStatus(row, forward)}
                      >
                        {JOB_STATUS_LABELS[forward]}
                        <ArrowRight className="size-3" aria-hidden />
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={previewHref(row.id)}>
                        <Eye className="size-3.5" aria-hidden />
                        Preview
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/jobs/${row.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
              {canWrite ? (
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all jobs on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-primary size-4"
                  />
                </th>
              ) : null}
              <th className="px-5 py-3 font-medium">Job</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Item / fault</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">
                Mechanic
              </th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-muted/40 border-b last:border-0"
              >
                {canWrite ? (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select job ${row.jobId ?? row.id}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="accent-primary size-4"
                    />
                  </td>
                ) : null}
                <td className="px-5 py-3">
                  <Link
                    href={previewHref(row.id)}
                    className="font-medium hover:underline"
                    aria-label={`Quick preview job ${row.jobId ?? row.id}`}
                  >
                    {row.jobId ? `#${row.jobId}` : "—"}
                  </Link>
                  <p className="text-muted-foreground text-xs">{row.code}</p>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="mt-1 -ml-2 h-6 px-2 text-xs"
                  >
                    <Link href={previewHref(row.id)}>
                      <Eye className="size-3" aria-hidden />
                      Preview
                    </Link>
                  </Button>
                </td>
                <td className="max-w-40 px-3 py-3">
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
                <td className="max-w-64 px-3 py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {row.brandName ? (
                      <Badge variant="outline">{row.brandName}</Badge>
                    ) : (
                      <Badge variant="warning">Untagged</Badge>
                    )}
                    {row.serviceTypeName ? (
                      <Badge variant="secondary">{row.serviceTypeName}</Badge>
                    ) : null}
                    {row.serialNo ? (
                      <span className="text-muted-foreground text-xs">
                        S/N {row.serialNo}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-medium">{row.item}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.fault}
                  </p>
                </td>
                <td className="text-muted-foreground hidden px-3 py-3 lg:table-cell">
                  {row.mechanicName}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatINR(row.amount, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-3">
                  <JobStatusBadge status={row.status} />
                </td>
                <td className="text-muted-foreground hidden px-3 py-3 text-xs xl:table-cell">
                  {shortDate(row.dateCreated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {waMessage !== null ? (
        <WaPreviewModal
          title="Bulk WhatsApp report"
          note="Selected jobs ka grouped summary. Message edit karke bhejein."
          initialMessage={waMessage}
          phone={waPhone}
          onClose={() => setWaMessage(null)}
        />
      ) : null}
    </>
  );
}
