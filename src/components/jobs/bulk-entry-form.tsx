"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { bulkCreateJobsAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: number; name: string; contact?: string };
type Row = { key: string; item: string; fault: string };

function newRow(): Row {
  return { key: crypto.randomUUID(), item: "", fault: "" };
}

export function BulkEntryForm({
  clients,
  mechanics,
}: {
  clients: Option[];
  mechanics: Option[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [
    newRow(),
    newRow(),
    newRow(),
    newRow(),
    newRow(),
  ]);
  const [pending, startTransition] = useTransition();

  function setRow(key: string, field: "item" | "fault", value: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  function save() {
    const client = Number(clientId);
    if (!client) {
      toast.error("Client chuniye.");
      return;
    }
    const valid = rows.filter(
      (row) => row.item.trim().length >= 2 && row.fault.trim().length >= 2,
    );
    if (!valid.length) {
      toast.error("Kam se kam ek row me item aur fault daalein.");
      return;
    }
    startTransition(async () => {
      const result = await bulkCreateJobsAction({
        clientId: client,
        mechanicId: mechanicId ? Number(mechanicId) : null,
        rows: valid.map((row) => ({ item: row.item, fault: row.fault })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.updated} jobs ban gaye.`);
      setRows(Array.from({ length: 5 }, () => newRow()));
      router.push("/jobs");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bulk-client">Client *</Label>
          <SearchableSelect
            id="bulk-client"
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
        <div className="grid gap-2">
          <Label htmlFor="bulk-mechanic">Mechanic</Label>
          <SearchableSelect
            id="bulk-mechanic"
            value={mechanicId}
            onChange={setMechanicId}
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
      </div>

      <div className="space-y-2">
        <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-xs">
          <span>Item / model *</span>
          <span>Fault *</span>
          <span className="w-9" />
        </div>
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
          >
            <Input
              aria-label={`Row ${index + 1} item`}
              value={row.item}
              maxLength={200}
              placeholder="e.g. Samsung AC"
              onChange={(event) => setRow(row.key, "item", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
            />
            <Input
              aria-label={`Row ${index + 1} fault`}
              value={row.fault}
              maxLength={400}
              placeholder="Kya problem hai"
              onChange={(event) => setRow(row.key, "fault", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove row ${index + 1}`}
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.key !== row.key),
                )
              }
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((current) => [...current, newRow()])}
        >
          <Plus className="size-4" aria-hidden />
          Add row
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending
            ? "Saving…"
            : `Create ${rows.filter((r) => r.item.trim() && r.fault.trim()).length} jobs`}
        </Button>
        <p className="text-muted-foreground text-xs">
          Empty rows ignore ho jaate hain. Enter dabakar bhi save kar sakte
          hain.
        </p>
      </div>
    </div>
  );
}
