"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addRequiredPartAction,
  setRequiredPartStatusAction,
} from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RequiredPart } from "@/lib/data/job-operations";

const STATUS_LABELS: Record<number, string> = {
  0: "Waiting",
  1: "Ordered",
  2: "Arrived",
};

export function RequiredPartsPanel({
  jobId,
  closed,
  parts,
}: {
  jobId: number;
  closed: boolean;
  parts: RequiredPart[];
}) {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [qtyNeeded, setQtyNeeded] = useState("1");
  const [sourceName, setSourceName] = useState("");
  const [phone, setPhone] = useState("");
  const [eta, setEta] = useState("");
  const [remark, setRemark] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addRequiredPartAction({
        jobId,
        productName,
        qtyNeeded: Number(qtyNeeded),
        sourceName,
        phone,
        eta,
        remark,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setProductName("");
      setQtyNeeded("1");
      setSourceName("");
      setPhone("");
      setEta("");
      setRemark("");
      toast.success("Required part add ho gaya.");
      router.refresh();
    });
  }

  function move(part: RequiredPart, status: number) {
    startTransition(async () => {
      const result = await setRequiredPartStatusAction({
        id: part.id,
        jobId,
        status,
        qtyNeeded: part.qtyNeeded,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status ${STATUS_LABELS[status]} ho gaya.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {parts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Abhi koi required part nahi.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {parts.map((part) => (
            <div key={part.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {part.productName}{" "}
                    <span className="text-muted-foreground text-xs">
                      × {part.qtyNeeded}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {STATUS_LABELS[part.status] ?? "Unknown"} ·{" "}
                    {part.sourceName || "Source —"} · {part.phone || "Phone —"}{" "}
                    · ETA {part.eta || "—"}
                  </p>
                  {part.remark ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {part.remark}
                    </p>
                  ) : null}
                </div>
                {!closed ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={part.status === status ? "default" : "outline"}
                        disabled={pending}
                        onClick={() => move(part, status)}
                      >
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {!closed ? (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="required-part-name">Saman / spare *</Label>
            <Input
              id="required-part-name"
              value={productName}
              maxLength={200}
              placeholder="e.g. SMPS board"
              onChange={(event) => setProductName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="required-part-qty">Qty needed *</Label>
            <Input
              id="required-part-qty"
              type="number"
              min="1"
              step="1"
              value={qtyNeeded}
              onChange={(event) => setQtyNeeded(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="required-part-phone">Supplier phone</Label>
            <Input
              id="required-part-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="required-part-source">Source / supplier</Label>
            <Input
              id="required-part-source"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="Kahan se mangwana hai"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="required-part-eta">ETA</Label>
            <Input
              id="required-part-eta"
              type="date"
              value={eta}
              onChange={(event) => setEta(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="required-part-remark">Remark</Label>
            <Input
              id="required-part-remark"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={add} disabled={pending}>
              {pending ? "Saving…" : "Add required part"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Cancelled/Delivered jobs ke liye required parts band hain.
        </p>
      )}
    </div>
  );
}
