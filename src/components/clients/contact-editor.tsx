"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type ContactDraft = {
  id?: number;
  name: string;
  label: string;
  phone: string;
  isPrimary: boolean;
};

export const CONTACT_LABEL_OPTIONS = [
  "Mobile",
  "Office",
  "WhatsApp",
  "Shop",
  "Other",
] as const;

const MAX_CONTACTS = 10;

const emptyContact: ContactDraft = {
  name: "",
  label: "Mobile",
  phone: "",
  isPrimary: false,
};

export function ContactEditor({
  initialContacts = [],
}: {
  initialContacts?: ContactDraft[];
}) {
  const [contacts, setContacts] = useState<ContactDraft[]>(initialContacts);

  function update(index: number, patch: Partial<ContactDraft>) {
    setContacts((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function makePrimary(index: number) {
    setContacts((rows) =>
      rows.map((row, rowIndex) => ({
        ...row,
        isPrimary: rowIndex === index,
      })),
    );
  }

  function remove(index: number) {
    setContacts((rows) => {
      const next = rows.filter((_, rowIndex) => rowIndex !== index);
      if (next.length && !next.some((row) => row.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  function add() {
    setContacts((rows) => {
      if (rows.length >= MAX_CONTACTS) return rows;
      return [...rows, { ...emptyContact, isPrimary: rows.length === 0 }];
    });
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <input type="hidden" name="contacts" value={JSON.stringify(contacts)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Extra contacts</p>
          <p className="text-muted-foreground text-xs">
            WhatsApp, office ya shop numbers. Primary number main contact
            banega.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={contacts.length >= MAX_CONTACTS}
        >
          <Plus className="size-4" aria-hidden />
          Add contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
          Sirf primary contact number use ho raha hai.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact, index) => (
            <li
              key={contact.id ?? `new-${index}`}
              className="bg-muted/20 grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_9rem_1fr_auto]"
            >
              <Input
                aria-label={`Contact ${index + 1} name`}
                placeholder="Name (optional)"
                maxLength={80}
                value={contact.name}
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
              <Select
                aria-label={`Contact ${index + 1} label`}
                value={contact.label}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
              >
                {CONTACT_LABEL_OPTIONS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Contact ${index + 1} phone`}
                placeholder="98765 43210"
                inputMode="tel"
                required
                value={contact.phone}
                onChange={(event) =>
                  update(index, { phone: event.target.value })
                }
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={contact.isPrimary ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => makePrimary(index)}
                  aria-pressed={contact.isPrimary}
                  title="Primary contact"
                >
                  <Star
                    className="size-4"
                    aria-hidden
                    fill={contact.isPrimary ? "currentColor" : "none"}
                  />
                  <span className="sr-only">Primary</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
