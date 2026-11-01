import { toNumber } from "@/lib/money";

export type ClientNameParts = {
  firstname: string | null;
  middlename?: string | null;
  lastname: string | null;
};

export function clientDisplayName(client: ClientNameParts): string {
  return [client.firstname, client.middlename, client.lastname]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Legacy `transaction_list.client_name` stores the numeric client id as text. */
export function parseLegacyClientId(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return Number.isSafeInteger(id) ? id : null;
}

export type ClientBalanceInput = {
  openingBalance: number | string | null | undefined;
  repairBilled: number | string | null | undefined;
  directSalesBilled: number | string | null | undefined;
  servicePaid: number | string | null | undefined;
};

export type ClientBalance = {
  billed: number;
  paid: number;
  due: number;
};

export function computeClientBalance(input: ClientBalanceInput): ClientBalance {
  const billed =
    toNumber(input.openingBalance) +
    toNumber(input.repairBilled) +
    toNumber(input.directSalesBilled);
  const paid = toNumber(input.servicePaid);
  return {
    billed: Math.round(billed * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    due: Math.round((billed - paid) * 100) / 100,
  };
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits ? `tel:${digits}` : null;
}

export function whatsAppHref(
  phone: string | null | undefined,
  text?: string,
): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 10) return null;
  const number = digits.length === 10 ? `91${digits}` : digits;
  const url = new URL(`https://wa.me/${number}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

/**
 * Stored paths are either full public URLs (new uploads) or bucket-relative
 * paths written by the legacy app.
 */
export function resolveClientPhotoUrl(
  imagePath: string | null | undefined,
  supabaseUrl: string,
): string | null {
  const path = imagePath?.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  const objectPath = clean.startsWith("client-photos/")
    ? clean
    : `client-photos/${clean}`;
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${objectPath}`;
}
