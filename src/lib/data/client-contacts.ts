import "server-only";

import { unwrap } from "@/lib/data/errors";
import { createClient } from "@/lib/supabase/server";

export const CONTACT_LABELS = [
  "Mobile",
  "Office",
  "WhatsApp",
  "Shop",
  "Other",
] as const;

export type ContactLabel = (typeof CONTACT_LABELS)[number];

export type ClientContactRow = {
  id: number;
  client_id: number;
  name: string | null;
  label: string;
  phone: string;
  is_primary: boolean;
};

export type ContactInput = {
  id?: number;
  name: string;
  label: ContactLabel;
  phone: string;
  isPrimary: boolean;
};

export async function listClientContacts(
  clientId: number,
): Promise<ClientContactRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("client_contacts")
    .select("id, client_id, name, label, phone, is_primary")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("id", { ascending: true });
  return unwrap(result, "clients.contacts") as ClientContactRow[];
}

export function normalizeContacts(contacts: ContactInput[]): ContactInput[] {
  const seen = new Set<string>();
  const cleaned = contacts
    .map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      phone: contact.phone.replace(/\D/g, ""),
    }))
    .filter((contact) => {
      if (contact.phone.length < 10 || contact.phone.length > 15) return false;
      if (seen.has(contact.phone)) return false;
      seen.add(contact.phone);
      return true;
    });

  const primaryIndex = cleaned.findIndex((contact) => contact.isPrimary);
  return cleaned.map((contact, index) => ({
    ...contact,
    isPrimary: index === (primaryIndex >= 0 ? primaryIndex : 0),
  }));
}

/**
 * Mirrors the submitted contact list onto `client_contacts` and keeps
 * `client_list.contact` on the primary number. Runs with the staff session
 * (RLS allows all staff writes), zero DDL.
 */
export async function syncClientContacts(
  clientId: number,
  rawContacts: ContactInput[],
): Promise<{ contacts: ClientContactRow[]; primaryPhone: string | null }> {
  const contacts = normalizeContacts(rawContacts);
  const supabase = await createClient();
  const existing = await listClientContacts(clientId);

  const byId = new Map(existing.map((row) => [row.id, row]));
  const byPhone = new Map(existing.map((row) => [row.phone, row]));

  const resolved = contacts.map((contact) => {
    const match =
      (contact.id ? byId.get(contact.id) : undefined) ??
      byPhone.get(contact.phone);
    return { contact, existingId: match?.id ?? null };
  });

  const keepIds = new Set(
    resolved
      .map((row) => row.existingId)
      .filter((id): id is number => id != null),
  );
  const removedIds = existing
    .filter((row) => !keepIds.has(row.id))
    .map((row) => row.id);

  if (removedIds.length) {
    const result = await supabase
      .from("client_contacts")
      .delete()
      .in("id", removedIds);
    if (result.error) throw new Error(result.error.message);
  }

  if (existing.length) {
    const result = await supabase
      .from("client_contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId);
    if (result.error) throw new Error(result.error.message);
  }

  for (const { contact, existingId } of resolved) {
    const payload = {
      client_id: clientId,
      name: contact.name || null,
      label: contact.label,
      phone: contact.phone,
      is_primary: contact.isPrimary,
    };
    const result = existingId
      ? await supabase
          .from("client_contacts")
          .update(payload)
          .eq("id", existingId)
      : await supabase.from("client_contacts").insert(payload);
    if (result.error) throw new Error(result.error.message);
  }

  const primaryPhone =
    resolved.find((row) => row.contact.isPrimary)?.contact.phone ?? null;
  if (primaryPhone) {
    const result = await supabase
      .from("client_list")
      .update({ contact: primaryPhone, date_updated: new Date().toISOString() })
      .eq("id", clientId);
    if (result.error) throw new Error(result.error.message);
  }

  return { contacts: await listClientContacts(clientId), primaryPhone };
}

export type DuplicateClient = {
  id: number;
  firstname: string;
  middlename: string | null;
  lastname: string;
  contact: string;
  email: string | null;
};

export async function findClientDuplicates({
  contact,
  email,
  excludeId,
}: {
  contact: string;
  email: string;
  excludeId?: number;
}): Promise<DuplicateClient[]> {
  const supabase = await createClient();
  const phone = contact.replace(/\D/g, "");
  const columns = "id, firstname, middlename, lastname, contact, email";

  const contactValues = [...new Set([contact, phone].filter(Boolean))];
  const queries = [
    supabase
      .from("client_list")
      .select(columns)
      .eq("delete_flag", 0)
      .in("contact", contactValues)
      .limit(5),
  ];
  if (email) {
    queries.push(
      supabase
        .from("client_list")
        .select(columns)
        .eq("delete_flag", 0)
        .eq("email", email)
        .limit(5),
    );
  }

  const results = await Promise.all(queries);
  const byId = new Map<number, DuplicateClient>();
  for (const result of results) {
    const rows = unwrap(result, "clients.duplicates") as DuplicateClient[];
    for (const row of rows) {
      if (excludeId && row.id === excludeId) continue;
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}
