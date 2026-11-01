import "server-only";

import { DataError, unwrap } from "@/lib/data/errors";
import type { AppRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TeamRole = Extract<AppRole, "admin" | "staff" | "developer">;

export type TeamMember = {
  id: string;
  fullName: string;
  role: string;
  email: string | null;
  mechanicId: number | null;
  updatedAt: string | null;
};

const TEAM_ROLES: readonly string[] = ["admin", "staff", "developer"];

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("profiles")
      .select("id, full_name, role, email, mechanic_id, date_updated")
      .order("full_name", { ascending: true, nullsFirst: false }),
    "team.list",
  );

  return rows
    .filter((row) => TEAM_ROLES.includes(row.role ?? ""))
    .map((row) => ({
      id: row.id,
      fullName: row.full_name ?? "—",
      role: row.role ?? "staff",
      email: row.email,
      mechanicId: row.mechanic_id,
      updatedAt: row.date_updated,
    }));
}

export type CreateTeamUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: TeamRole;
  mechanicId: number | null;
};

/**
 * Auth user + explicit `profiles` row (the shared DB's auto-profile trigger was
 * dropped in 20260809; service-role bypasses both RLS and the
 * prevent_role_escalation trigger). Profile insert failure rolls the auth user
 * back so we never leave an account without a role.
 */
export async function createTeamUser(input: CreateTeamUserInput) {
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (created.error || !created.data.user) {
    throw new DataError(
      "team.auth.create",
      created.error?.message ?? "Auth user create nahi hua.",
    );
  }

  const userId = created.data.user.id;
  const profile = await admin.from("profiles").insert({
    id: userId,
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    mechanic_id: input.mechanicId,
    date_updated: new Date().toISOString(),
  });

  if (profile.error) {
    await admin.auth.admin.deleteUser(userId);
    throw new DataError("team.profile.create", profile.error.message);
  }

  return { id: userId };
}
