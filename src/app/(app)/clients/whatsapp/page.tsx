import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientSummaries } from "@/lib/data/clients";
import { whatsAppHref } from "@/lib/domain/client";

export const metadata = { title: "WhatsApp clients" };

function messageFor(name: string): string {
  return `Namaste ${name}, V-Tech se. Aapke vehicle service ke baare me update ke liye message kar rahe hain.`;
}

export default async function ClientsWhatsAppPage({
  searchParams,
}: PageProps<"/clients/whatsapp">) {
  const params = await searchParams;
  const raw = params.id;
  const ids = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((value) => Number(value))
    .filter((value) => Number.isSafeInteger(value) && value > 0);

  const clients = await getClientSummaries(ids);
  const numbers = clients.map((client) => client.contact).join(", ");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/clients">
          <ArrowLeft className="size-4" aria-hidden />
          Clients
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          WhatsApp selected
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {clients.length} client{clients.length === 1 ? "" : "s"} selected. Har
          link par click karke WhatsApp chat khulega.
        </p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Koi client select nahi hua</CardTitle>
            <CardDescription>
              Clients page par checkboxes se clients chun kar dobara try karein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/clients">Clients kholen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Numbers</CardTitle>
              <CardDescription>
                Copy karke apne WhatsApp broadcast me paste karein.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                readOnly
                value={numbers}
                rows={3}
                aria-label="Selected client numbers"
                className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {clients.map((client) => {
                const href = whatsAppHref(
                  client.contact,
                  messageFor(client.name),
                );
                return (
                  <li
                    key={client.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {client.contact}
                      </p>
                    </div>
                    {href ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={href} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" aria-hidden />
                          WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Invalid number
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
