import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "staff" | "client" | "developer";

export const STAFF_ROLES: readonly AppRole[] = ["admin", "staff", "developer"];

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    full_name: string | null;
    role: AppRole;
    mechanic_id: number | null;
    client_id: number | null;
    email: string | null;
  };
};

export const getSession = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const userId = data.claims.sub;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, mechanic_id, client_id, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId,
    email:
      typeof data.claims.email === "string" ? data.claims.email : profile.email,
    profile: {
      ...profile,
      role: profile.role as AppRole,
    },
  };
});

export async function requireSession(): Promise<SessionProfile> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isStaffRole(role: AppRole) {
  return STAFF_ROLES.includes(role);
}
