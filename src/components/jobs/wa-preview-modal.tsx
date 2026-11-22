"use client";

import { Check, Copy, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Shared WhatsApp preview — single, bulk aur detail actions isi se guzarte hain. */
export function WaPreviewModal({
  title = "WhatsApp message",
  note,
  initialMessage,
  phone,
  onClose,
}: {
  title?: string;
  note?: string;
  initialMessage: string;
  phone?: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const [number, setNumber] = useState(phone ?? "");
  const [copied, setCopied] = useState(false);

  const digits = number.replace(/\D/g, "");
  const waLink = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copy ho gaya.");
    } catch {
      toast.error("Copy nahi hua. Text manually select karein.");
    }
  }

  function send() {
    if (!digits) {
      toast.error("Client ka phone number nahi mila.");
      return;
    }
    if (!message.trim()) {
      toast.error("Message khali nahi ho sakta.");
      return;
    }
    window.open(waLink, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-background w-full max-w-lg space-y-4 rounded-lg border p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {note ? (
              <p className="text-muted-foreground mt-1 text-sm">{note}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close WhatsApp preview"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="wa-phone">Phone number</Label>
          <Input
            id="wa-phone"
            inputMode="tel"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="91XXXXXXXXXX"
          />
        </div>

        <div className="bg-muted/40 rounded-lg border p-3">
          <p className="text-muted-foreground mb-2 text-xs">Preview</p>
          <Textarea
            aria-label="WhatsApp message"
            value={message}
            rows={7}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" onClick={send}>
            <Send className="size-4" aria-hidden />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
