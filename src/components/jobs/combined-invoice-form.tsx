"use client";

import { FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getJobsForInvoiceAction } from "@/app/(app)/jobs/actions";
import type { InvoiceJob } from "@/lib/data/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { JOB_STATUS_LABELS, isJobStatus } from "@/lib/constants/status";
import { formatIST, todayIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

function fmtDate(value: string): string {
  return formatIST(value, { day: "2-digit", month: "short", year: "numeric" });
}

export function CombinedInvoiceForm({
  clients,
  company,
  initialIds = [],
  initialBillType = "non_gst",
}: {
  clients: Array<{ id: number; name: string; contact: string }>;
  company: { name: string; address: string; contact: string; gstin: string };
  initialIds?: number[];
  initialBillType?: "non_gst" | "gst";
}) {
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<InvoiceJob[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [billType, setBillType] = useState<"non_gst" | "gst">(initialBillType);
  const [loading, setLoading] = useState(false);

  const client = clients.find((item) => String(item.id) === clientId);
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const total = selectedRows.reduce((sum, row) => sum + row.amount, 0);
  const gstAmount =
    billType === "gst" ? Math.round(total * 0.18 * 100) / 100 : 0;

  function load(ids: number[] = []) {
    const clean = ids.filter((id) => Number.isSafeInteger(id) && id > 0);
    const id = Number(clientId);
    if (!clean.length && (!Number.isSafeInteger(id) || id <= 0)) {
      toast.error("Client chuniye.");
      return;
    }
    setLoading(true);
    void getJobsForInvoiceAction(clean.length ? null : id, clean).then(
      (result) => {
        setLoading(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setRows(result.rows);
        setSelected(new Set(result.rows.map((row) => row.id)));
        const firstClient = result.rows.find((row) => row.clientId)?.clientId;
        if (firstClient) setClientId(String(firstClient));
        if (!result.rows.length) toast.info("Koi job nahi mili.");
      },
    );
  }

  useEffect(() => {
    // Selected-row entry point loads once; later client changes use the button.
    if (initialIds.length) {
      void Promise.resolve().then(() => load(initialIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor="invoice-client">Client *</Label>
          <SearchableSelect
            id="invoice-client"
            value={clientId}
            onChange={setClientId}
            placeholder="Client search karein…"
            options={clients.map((item) => ({
              value: String(item.id),
              label: item.name,
              hint: item.contact,
              keywords: item.contact,
            }))}
          />
        </div>
        <Button type="button" onClick={() => load()} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="size-4" aria-hidden />
          )}
          Load jobs
        </Button>
        <div className="grid gap-2">
          <Label htmlFor="invoice-bill-type">Bill type</Label>
          <select
            id="invoice-bill-type"
            value={billType}
            onChange={(event) =>
              setBillType(event.target.value as "non_gst" | "gst")
            }
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="non_gst">Non-GST</option>
            <option value="gst">GST (18%)</option>
          </select>
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          disabled={!selectedRows.length}
        >
          <Printer className="size-4" aria-hidden />
          Print invoice
        </Button>
      </div>

      {rows.length > 0 ? (
        <Card className="print:hidden">
          <CardContent className="space-y-2 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(rows.map((row) => row.id)))}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <Badge variant="secondary">{selected.size} selected</Badge>
            </div>
            <div className="divide-y rounded-md border">
              {rows.map((row) => (
                <label
                  key={row.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="accent-primary size-4"
                  />
                  <span className="text-muted-foreground w-20 shrink-0">
                    #{row.jobId ?? row.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.item}</span>
                  <span className="text-muted-foreground hidden sm:inline">
                    {isJobStatus(row.status)
                      ? JOB_STATUS_LABELS[row.status]
                      : row.status}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatINR(row.amount)}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm print:hidden">
          Client chun kar “Load jobs” dabayein, phir invoice ke liye jobs
          chuniye.
        </p>
      )}

      {selectedRows.length > 0 ? (
        <div className="bg-background hidden print:block">
          <div className="mx-auto max-w-3xl p-6">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold">{company.name}</h3>
                <p className="text-sm whitespace-pre-line">{company.address}</p>
                <p className="text-sm">{company.contact}</p>
                {billType === "gst" && company.gstin ? (
                  <p className="text-sm">GSTIN: {company.gstin}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">Combined Invoice</p>
                <p className="text-sm">{fmtDate(todayIST())}</p>
              </div>
            </div>

            <div className="my-4">
              <p className="font-semibold">Bill to:</p>
              <p className="text-sm">{client?.name ?? "—"}</p>
              <p className="text-sm">{client?.contact ?? ""}</p>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Job</th>
                  <th className="py-2 text-left">Item / fault</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row, index) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2">
                      #{row.jobId ?? row.id}
                      <span className="block text-xs">{row.code}</span>
                    </td>
                    <td className="py-2">
                      {row.item}
                      <span className="block text-xs">{row.fault}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatINR(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-y font-semibold">
                  <td className="py-2 text-right" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatINR(total)}
                  </td>
                </tr>
                {billType === "gst" ? (
                  <tr>
                    <td className="py-2 text-right" colSpan={3}>
                      GST @18%
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatINR(gstAmount)}
                    </td>
                  </tr>
                ) : null}
                <tr className="font-bold">
                  <td className="py-2 text-right" colSpan={3}>
                    Grand total
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatINR(total + gstAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-8 border-t pt-4 text-xs">
              Paid — thank you! · Generated {fmtDate(todayIST())}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
