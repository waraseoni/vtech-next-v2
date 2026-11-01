/** `code` = YYYYMMDD + daily sequence (2+ digits). */
export function jobCodePrefix(dateStr: string): string {
  return dateStr.replaceAll("-", "");
}

export function formatJobCode(dateStr: string, sequence: number): string {
  return `${jobCodePrefix(dateStr)}${String(Math.max(1, sequence)).padStart(2, "0")}`;
}

/** Highest same-day sequence among existing codes, +1. */
export function nextJobCodeSequence(
  dateStr: string,
  existingCodes: Array<string | null | undefined>,
): number {
  const prefix = jobCodePrefix(dateStr);
  let max = 0;
  for (const code of existingCodes) {
    if (!code?.startsWith(prefix)) continue;
    const suffix = code.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    max = Math.max(max, parseInt(suffix, 10));
  }
  return max + 1;
}

export const SALE_CODE_PREFIX = "SALE";
const SALE_SEQ_WIDTH = 6;

export function formatSaleCode(sequence: number): string {
  return `${SALE_CODE_PREFIX}${String(Math.max(1, sequence)).padStart(SALE_SEQ_WIDTH, "0")}`;
}

export function nextSaleCodeSequence(
  existingCodes: Array<string | null | undefined>,
): number {
  let max = 0;
  for (const code of existingCodes) {
    if (!code?.startsWith(SALE_CODE_PREFIX)) continue;
    const suffix = code.slice(SALE_CODE_PREFIX.length);
    if (!/^\d+$/.test(suffix)) continue;
    max = Math.max(max, parseInt(suffix, 10));
  }
  return max + 1;
}

/** Numeric part of any SALE code, or null when it does not match. */
export function parseSaleCodeSequence(
  code: string | null | undefined,
): number | null {
  if (!code?.startsWith(SALE_CODE_PREFIX)) return null;
  const suffix = code.slice(SALE_CODE_PREFIX.length);
  if (!/^\d+$/.test(suffix)) return null;
  return parseInt(suffix, 10);
}
