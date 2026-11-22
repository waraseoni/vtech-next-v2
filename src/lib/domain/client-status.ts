export type ClientTier = "high-risk" | "due" | "follow-up" | "clear";

export const HIGH_RISK_THRESHOLD = 20_000;
export const FOLLOW_UP_DAYS = 30;

/** v1-compatible follow-up buckets, based on the service due amount. */
export function clientTier(
  due: number,
  lastTxnDate: string | null | undefined,
  today = new Date(),
): ClientTier {
  if (due > HIGH_RISK_THRESHOLD) return "high-risk";
  if (due > 0) return "due";

  const last = lastTxnDate
    ? new Date(`${lastTxnDate.slice(0, 10)}T00:00:00+05:30`)
    : null;
  if (!last || Number.isNaN(last.getTime())) return "clear";
  const days = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  return days > FOLLOW_UP_DAYS ? "follow-up" : "clear";
}

export function daysSince(
  value: string | null | undefined,
  today = new Date(),
): number | null {
  if (!value) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value,
  );
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(
    0,
    Math.floor((today.getTime() - date.getTime()) / 86_400_000),
  );
}

export const CLIENT_TIER_LABEL: Record<ClientTier, string> = {
  "high-risk": "High risk",
  due: "Due",
  "follow-up": "Follow-up",
  clear: "Clear",
};
