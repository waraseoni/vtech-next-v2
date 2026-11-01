import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/clients">
          <ArrowLeft className="size-4" aria-hidden />
          All clients
        </Link>
      </Button>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New client</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Basic details daal kar client directory me add karein.
        </p>
      </div>
      <ClientForm />
    </div>
  );
}
