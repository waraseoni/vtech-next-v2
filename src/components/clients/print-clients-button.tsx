"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintClientsButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      Print
    </Button>
  );
}
