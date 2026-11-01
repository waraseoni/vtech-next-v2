import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Cookie-less client so public reads can be cached at the data layer. */
export function createPublicClient() {
  const { url, key } = getPublicEnv();
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
