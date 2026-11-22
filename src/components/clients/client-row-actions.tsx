import { Eye, MessageCircle, Pencil, Wallet } from "lucide-react";
import Link from "next/link";

import { DeleteClientIcon } from "@/components/clients/delete-client-icon";
import { whatsAppHref } from "@/lib/domain/client";

export function ClientRowActions({
  id,
  name,
  contact,
  canDelete,
}: {
  id: number;
  name: string;
  contact: string;
  canDelete: boolean;
}) {
  const whatsapp = whatsAppHref(contact, `Namaste ${name}, V-Tech se.`);
  const buttonClass =
    "text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md";

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/clients/${id}`}
        aria-label={`View ${name}`}
        title="View"
        className={buttonClass}
      >
        <Eye className="size-4" aria-hidden />
      </Link>
      <Link
        href={`/clients/${id}/edit`}
        aria-label={`Edit ${name}`}
        title="Edit"
        className={buttonClass}
      >
        <Pencil className="size-4" aria-hidden />
      </Link>
      <Link
        href={`/clients/${id}/payments/new`}
        aria-label={`Add payment for ${name}`}
        title="Add payment"
        className={buttonClass}
      >
        <Wallet className="size-4" aria-hidden />
      </Link>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${name}`}
          title="WhatsApp"
          className={buttonClass}
        >
          <MessageCircle className="size-4" aria-hidden />
        </a>
      ) : null}
      {canDelete ? <DeleteClientIcon id={id} name={name} /> : null}
    </div>
  );
}
