export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: Array<number | string | null | undefined>) {
  return roundMoney(
    values.reduce<number>((total, value) => total + toNumber(value), 0),
  );
}

export function formatINR(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    ...options,
  }).format(toNumber(value));
}

/** "₹3.5L"-style short form for charts and tiles. */
export function formatINRCompact(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

/** Quantity × price, rounded to paise. */
export function lineTotal(
  qty: number | string,
  price: number | string,
): number {
  return roundMoney(toNumber(qty) * toNumber(price));
}
