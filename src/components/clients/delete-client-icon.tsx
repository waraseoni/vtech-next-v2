"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteClientAction } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

export function DeleteClientIcon({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      title={`Delete ${name}`}
      onClick={() => {
        if (
          !window.confirm(
            `${name} ko delete karein? Records archive ho jayenge (soft delete).`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const formData = new FormData();
          formData.set("id", String(id));
          await deleteClientAction({ error: null }, formData);
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      <span className="sr-only">Delete {name}</span>
    </Button>
  );
}
