import "server-only";

import { unstable_cache } from "next/cache";

import { assertOk, unwrap } from "@/lib/data/errors";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const PUBLIC_SETTING_FIELDS = [
  "name",
  "short_name",
  "logo",
  "cover",
  "email",
  "contact",
  "address",
  "owner",
  "biz_days",
  "biz_open",
  "biz_close",
  "gst_no",
  "gstin",
  "map_url",
  "map_iframe",
  "whatsapp",
  "facebook",
  "instagram",
  "youtube",
  "footer_text",
  "announcement",
] as const;

export const WRITABLE_SETTING_FIELDS = [
  ...PUBLIC_SETTING_FIELDS,
  "upi_id",
  "geofence_enabled",
  "geofence_lat",
  "geofence_lng",
  "geofence_radius_m",
] as const;

const writable = new Set<string>(WRITABLE_SETTING_FIELDS);

export type SettingsMap = Record<string, string>;

export async function getSettings(): Promise<SettingsMap> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from("system_info").select("meta_field, meta_value"),
    "settings.read",
  );
  return Object.fromEntries(
    rows.map((row) => [row.meta_field, row.meta_value]),
  );
}

export const getPublicSettings = unstable_cache(
  async (): Promise<SettingsMap> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("system_info")
      .select("meta_field, meta_value")
      .in("meta_field", [...PUBLIC_SETTING_FIELDS]);
    if (error) throw new Error(`settings.public: ${error.message}`);
    return Object.fromEntries(
      (data ?? []).map((row) => [row.meta_field, row.meta_value]),
    );
  },
  ["public-settings"],
  { revalidate: 300, tags: ["system-info"] },
);

export async function saveSettings(entries: SettingsMap) {
  const allowed = Object.entries(entries).filter(([field]) =>
    writable.has(field),
  );
  if (!allowed.length) return { saved: 0, ignored: Object.keys(entries) };

  const supabase = await createClient();
  const fields = allowed.map(([field]) => field);
  const existing = unwrap(
    await supabase
      .from("system_info")
      .select("id, meta_field")
      .in("meta_field", fields),
    "settings.existing",
  );
  const existingByField = new Map(
    existing.map((row) => [row.meta_field, row.id]),
  );

  const updates = allowed
    .filter(([field]) => existingByField.has(field))
    .map(([field, value]) =>
      supabase
        .from("system_info")
        .update({ meta_value: value })
        .eq("id", existingByField.get(field)!)
        .then((result) => assertOk(result, "settings.update")),
    );
  await Promise.all(updates);

  const inserts = allowed
    .filter(([field]) => !existingByField.has(field))
    .map(([meta_field, meta_value]) => ({ meta_field, meta_value }));
  if (inserts.length) {
    assertOk(
      await supabase.from("system_info").insert(inserts),
      "settings.insert",
    );
  }

  return {
    saved: allowed.length,
    ignored: Object.keys(entries).filter((f) => !writable.has(f)),
  };
}

export type SystemInfo = {
  appVersion: string;
  nodeEnv: string;
  supabaseHost: string;
  dbMs: number;
  counts: {
    jobs: number;
    clients: number;
    sales: number;
    mechanics: number;
    attendance: number;
  };
};

export async function getSystemInfo(): Promise<SystemInfo> {
  const supabase = await createClient();
  const started = performance.now();

  const [jobs, clients, sales, mechanics, attendance] = await Promise.all([
    supabase
      .from("transaction_list")
      .select("id", { count: "exact", head: true })
      .eq("del_status", 0),
    supabase
      .from("client_list")
      .select("id", { count: "exact", head: true })
      .eq("delete_flag", 0),
    supabase.from("direct_sales").select("id", { count: "exact", head: true }),
    supabase
      .from("mechanic_list")
      .select("id", { count: "exact", head: true })
      .eq("delete_flag", 0),
    supabase
      .from("attendance_list")
      .select("id", { count: "exact", head: true }),
  ]);

  const { url } = getPublicEnv();
  return {
    appVersion: process.env.npm_package_version ?? "0.1.0",
    nodeEnv: process.env.NODE_ENV ?? "development",
    supabaseHost: new URL(url).host,
    dbMs: Math.round(performance.now() - started),
    counts: {
      jobs: jobs.count ?? 0,
      clients: clients.count ?? 0,
      sales: sales.count ?? 0,
      mechanics: mechanics.count ?? 0,
      attendance: attendance.count ?? 0,
    },
  };
}
