"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { WaPreviewModal } from "@/components/jobs/wa-preview-modal";
import { JOB_STATUS_LABELS, isJobStatus } from "@/lib/constants/status";
import { formatINR } from "@/lib/money";

export function JobWhatsAppButton({
  jobId,
  item,
  status,
  amount,
  clientName,
  phone,
}: {
  jobId: string | null;
  item: string;
  status: number;
  amount: number;
  clientName: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const label = isJobStatus(status) ? JOB_STATUS_LABELS[status] : "Unknown";
  const message = [
    `Namaste ${clientName},`,
    "",
    `Aapka job #${jobId ?? "—"} (${item}) ka status: ${label}.`,
    `Bill amount: ${formatINR(amount)}.`,
    "",
    "Koi question ho to yahi reply kar dein.",
  ].join("\n");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="size-4" aria-hidden />
        WhatsApp
      </Button>
      {open ? (
        <WaPreviewModal
          title="Job status WhatsApp"
          note="Message edit karke bhejein ya copy karein."
          initialMessage={message}
          phone={phone}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
