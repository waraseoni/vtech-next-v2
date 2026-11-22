"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { recordJobPaymentAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { todayIST } from "@/lib/date";
import type { PaymentMode, PaymentType } from "@/lib/supabase/database.types";

const PAYMENT_TYPES: PaymentType[] = [
  "Full",
  "Partial",
  "Advance",
  "On Account",
];

const PAYMENT_MODES: PaymentMode[] = [
  "Cash",
  "PhonePe/GPay",
  "UPI",
  "NEFT",
  "Cheque",
  "Bank Transfer",
];

export function AddPaymentDialog({
  jobId,
  clientName,
  billAmount,
  hasClient,
}: {
  jobId: number;
  clientName: string;
  billAmount: number;
  hasClient: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [billNo, setBillNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIST());
  const [paymentType, setPaymentType] = useState<PaymentType>("Full");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [remarks, setRemarks] = useState("");
  const [pending, startTransition] = useTransition();

  const numericAmount = Number(amount) || 0;
  const numericDiscount = Number(discount) || 0;
  const net = Math.max(0, numericAmount - numericDiscount);

  function save() {
    startTransition(async () => {
      const result = await recordJobPaymentAction({
        jobId,
        amount: numericAmount,
        discount: numericDiscount,
        billNo,
        paymentDate,
        paymentType,
        paymentMode,
        remarks,
      });
      if (result.ok) {
        toast.success("Payment save ho gayi.");
        setOpen(false);
        setAmount("");
        setDiscount("0");
        setBillNo("");
        setRemarks("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!hasClient) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="Walk-in job"
      >
        <Plus className="size-4" aria-hidden />
        Add payment
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        Add payment
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Record new payment"
        >
          <div className="bg-background max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Record new payment</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {clientName} · Bill{" "}
                  {new Intl.NumberFormat("en-IN").format(billAmount)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close payment dialog"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">Amount (₹) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-discount">Discount (₹)</Label>
                <Input
                  id="pay-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <p className="text-sm font-medium">
                  Net settled:{" "}
                  <span className="tabular-nums">
                    {new Intl.NumberFormat("en-IN").format(net)}
                  </span>
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-bill-no">Bill no. (optional)</Label>
                <Input
                  id="pay-bill-no"
                  value={billNo}
                  placeholder="e.g. INV-001"
                  onChange={(event) => setBillNo(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-date">Payment date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-type">Payment type</Label>
                <Select
                  id="pay-type"
                  value={paymentType}
                  onChange={(event) =>
                    setPaymentType(event.target.value as PaymentType)
                  }
                >
                  {PAYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-mode">Payment mode *</Label>
                <Select
                  id="pay-mode"
                  value={paymentMode}
                  onChange={(event) =>
                    setPaymentMode(event.target.value as PaymentMode)
                  }
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="pay-remarks">Remarks</Label>
                <Input
                  id="pay-remarks"
                  value={remarks}
                  placeholder="Koi notes..."
                  onChange={(event) => setRemarks(event.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save payment"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
