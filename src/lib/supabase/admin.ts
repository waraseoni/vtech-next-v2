import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env.server";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const { url, secretKey } = getServerEnv();

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
