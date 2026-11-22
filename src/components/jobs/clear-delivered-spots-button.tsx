"use client";

import { Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { clearDeliveredSpotsAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";

export function ClearDeliveredSpotsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Eraser className="size-4" aria-hidden />
        Clear delivered spots
      </Button>
    );
  }

  return (
    <span className="inline-flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await clearDeliveredSpotsAction();
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(
              `${result.updated ?? 0} delivered jobs ke spot clear hue.`,
            );
            setConfirming(false);
            router.refresh();
          })
        }
      >
        {pending ? "Clearing…" : "Confirm clear"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </span>
  );
}
