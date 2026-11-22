"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { quickCreateJobAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: number; name: string; contact?: string };

export function QuickCreateJob({
  clients,
  mechanics,
}: {
  clients: Option[];
  mechanics: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [item, setItem] = useState("");
  const [fault, setFault] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    const client = Number(clientId);
    if (!client || item.trim().length < 2 || fault.trim().length < 2) {
      toast.error("Client, item aur fault zaroori hai.");
      return;
    }
    startTransition(async () => {
      const result = await quickCreateJobAction({
        clientId: client,
        mechanicId: mechanicId ? Number(mechanicId) : null,
        item,
        fault,
      });
      if (!result.ok || !result.id) {
        toast.error(result.error);
        return;
      }
      toast.success("Job ban gaya. Ab billing/detail complete karein.");
      router.push(`/jobs/${result.id}/edit`);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Quick create
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick create job"
        >
          <div className="bg-background w-full max-w-lg space-y-4 rounded-lg border p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Quick create</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Pending job ban kar direct edit page par le jayega.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close quick create"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="quick-client">Client *</Label>
                <SearchableSelect
                  id="quick-client"
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="quick-mechanic">Mechanic</Label>
                <SearchableSelect
                  id="quick-mechanic"
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="quick-item">Item / model *</Label>
                <Input
                  id="quick-item"
                  value={item}
                  maxLength={200}
                  onChange={(event) => setItem(event.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="quick-fault">Fault reported *</Label>
                <Input
                  id="quick-fault"
                  value={fault}
                  maxLength={400}
                  onChange={(event) => setFault(event.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Creating…" : "Create & edit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
