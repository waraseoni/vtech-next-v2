import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (token) {
    const provided =
      new URL(request.url).searchParams.get("token") ??
      request.headers.get("x-health-token");
    if (provided !== token) {
      return Response.json({ ok: false }, { status: 401 });
    }
  }

  const { url, key } = getPublicEnv();
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const started = performance.now();
  const { error } = await supabase
    .from("system_info")
    .select("meta_field")
    .eq("meta_field", "name")
    .maybeSingle();
  const dbMs = Math.round(performance.now() - started);

  if (error) {
    return Response.json(
      { ok: false, dbMs, error: error.message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { ok: true, dbMs, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
