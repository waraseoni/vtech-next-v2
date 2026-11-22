/**
 * Derived `item` label for jobs (service center data model P2).
 *
 * Rule (plan §2.5): never silently overwrite legacy free text.
 * - No structured device fields → keep the legacy `item` exactly as typed.
 * - Structured fields present → compose `brand + category + model`.
 * - Composed value is capped at the existing 200-char `item` schema limit.
 */

export type JobDeviceParts = {
  brand?: string | null;
  category?: string | null;
  model?: string | null;
};

export const JOB_ITEM_MAX_LENGTH = 200;

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasStructuredDevice(parts: JobDeviceParts): boolean {
  return Boolean(
    clean(parts.brand) || clean(parts.category) || clean(parts.model),
  );
}

export function composeJobItemLabel(
  parts: JobDeviceParts,
  legacyItem?: string | null,
): string {
  if (!hasStructuredDevice(parts)) return clean(legacyItem);

  const label = [clean(parts.brand), clean(parts.category), clean(parts.model)]
    .filter(Boolean)
    .join(" ");

  return label.slice(0, JOB_ITEM_MAX_LENGTH);
}

/** True when composing would hide information present in the legacy free-text value. */
export function wouldShrinkLegacyItem(
  composed: string,
  legacyItem?: string | null,
): boolean {
  const legacy = clean(legacyItem);
  return legacy.length > 0 && composed.trim().length < legacy.length;
}
