import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  HEALTH_CHECK_TOKEN: z.string().min(1).optional(),
});

export function getServerEnv() {
  const parsed = serverSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
  });

  if (!parsed.success) {
    throw new Error("Invalid server environment variables.");
  }

  const secretKey =
    parsed.data.SUPABASE_SECRET_KEY ?? parsed.data.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return {
    ...getPublicEnv(),
    secretKey,
    healthCheckToken: parsed.data.HEALTH_CHECK_TOKEN,
  };
}
