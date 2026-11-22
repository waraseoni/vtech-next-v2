"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkEditJobsAction,
  getJobsForClientAction,
} from "@/app/(app)/jobs/actions";
import type { BulkEditableJob } from "@/lib/data/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: number; name: string; contact?: string };

type EditRow = {
  id: number;
  jobId: string | null;
  item: string;
  fault: string;
  remark: string;
  mechanicId: number | null;
  clientId: number | null;
};

export function BulkEditForm({
  clients,
  mechanics,
}: {
  clients: Option[];
  mechanics: Option[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  function load() {
    const client = Number(clientId);
    if (!client) {
      toast.error("Pehle client chuniye.");
      return;
    }
    setLoading(true);
    void getJobsForClientAction(client).then((result) => {
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.rows.length) {
        toast.info("Is client ke koi jobs nahi mile.");
      }
      setRows(
        result.rows.map((job: BulkEditableJob) => ({
          id: job.id,
          jobId: job.jobId,
          item: job.item,
          fault: job.fault,
          remark: job.remark,
          mechanicId: job.mechanicId,
          clientId: job.clientId,
        })),
      );
    });
  }

  function setRow(
    id: number,
    field: keyof EditRow,
    value: string | number | null,
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function save() {
    if (!rows.length) {
      toast.error("Koi row nahi.");
      return;
    }
    startTransition(async () => {
      const result = await bulkEditJobsAction({
        rows: rows.map((row) => ({
          id: row.id,
          item: row.item,
          fault: row.fault,
          remark: row.remark,
          mechanicId: row.mechanicId,
          clientId: row.clientId,
          targetClientId: Number(clientId) || null,
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.updated} jobs update ho gaye.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor="bulk-edit-client">Client *</Label>
          <SearchableSelect
            id="bulk-edit-client"
            value={clientId}
            onChange={setClientId}
            placeholder="Client search karein…"
            options={clients.map((client) => ({
              value: String(client.id),
              label: client.name,
              hint: client.contact,
              keywords: client.contact,
            }))}
          />
        </div>
        <Button type="button" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          Load jobs
        </Button>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2">
          <div className="text-muted-foreground grid grid-cols-[80px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_140px] gap-2 text-xs">
            <span>Job</span>
            <span>Item *</span>
            <span>Fault *</span>
            <span>Remark</span>
            <span>Mechanic</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[80px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_140px] items-center gap-2"
            >
              <span className="text-muted-foreground text-sm">
                #{row.jobId ?? row.id}
              </span>
              <Input
                aria-label={`Job ${row.jobId ?? row.id} item`}
                value={row.item}
                maxLength={200}
                onChange={(event) => setRow(row.id, "item", event.target.value)}
              />
              <Input
                aria-label={`Job ${row.jobId ?? row.id} fault`}
                value={row.fault}
                maxLength={400}
                onChange={(event) =>
                  setRow(row.id, "fault", event.target.value)
                }
              />
              <Input
                aria-label={`Job ${row.jobId ?? row.id} remark`}
                value={row.remark}
                maxLength={400}
                onChange={(event) =>
                  setRow(row.id, "remark", event.target.value)
                }
              />
              <SearchableSelect
                aria-label={`Job ${row.jobId ?? row.id} mechanic`}
                value={row.mechanicId ? String(row.mechanicId) : ""}
                onChange={(next) =>
                  setRow(row.id, "mechanicId", next ? Number(next) : null)
                }
                placeholder="Unassigned"
                options={[
                  { value: "", label: "Unassigned" },
                  ...mechanics.map((mechanic) => ({
                    value: String(mechanic.id),
                    label: mechanic.name,
                  })),
                ]}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRows([])}>
              Discard
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : `Save ${rows.length} jobs`}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Client chun kar “Load jobs” dabayein. Sab jobs ek saath edit ho sakti
          hain. Line items nahi chhte.
        </p>
      )}
    </div>
  );
}
