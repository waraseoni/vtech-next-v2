import "server-only";

import { DataError, unwrap } from "@/lib/data/errors";
import { TEAM_ROLES, type TeamRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type { TeamRole };

export type TeamMember = {
  id: string;
  fullName: string;
  role: string;
  email: string | null;
  mechanicId: number | null;
  updatedAt: string | null;
};

/**
 * Legacy profile rows often have `email = null` (the auth user is the source of
 * truth), so the team list falls back to Supabase Auth emails.
 */
async function authEmailMap(): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const emails = new Map<string, string | null>();

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw new DataError("team.auth.list", error.message);

    for (const user of data.users) {
      emails.set(user.id, user.email ?? null);
    }

    if (data.users.length < 200) break;
  }

  return emails;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const [rows, emails] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, email, mechanic_id, date_updated")
      .in("role", [...TEAM_ROLES])
      .order("full_name", { ascending: true, nullsFirst: false })
      .then((result) => unwrap(result, "team.list")),
    authEmailMap(),
  ]);

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name ?? "—",
    role: row.role ?? "staff",
    email: emails.get(row.id) ?? row.email ?? null,
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
export async function createTeamUser(
  input: CreateTeamUserInput,
  options: { reassignFromId?: string | null } = {},
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const reassignFromId = options.reassignFromId ?? null;

  if (reassignFromId) {
    const cleared = await admin
      .from("profiles")
      .update({ mechanic_id: null, date_updated: now })
      .eq("id", reassignFromId);

    if (cleared.error) {
      throw new DataError("team.mechanic.unlink", cleared.error.message);
    }
  }

  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (created.error || !created.data.user) {
    if (reassignFromId && input.mechanicId !== null) {
      await admin
        .from("profiles")
        .update({ mechanic_id: input.mechanicId })
        .eq("id", reassignFromId);
    }
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
    date_updated: now,
  });

  if (profile.error) {
    await admin.auth.admin.deleteUser(userId);
    if (reassignFromId && input.mechanicId !== null) {
      await admin
        .from("profiles")
        .update({ mechanic_id: input.mechanicId })
        .eq("id", reassignFromId);
    }
    throw new DataError("team.profile.create", profile.error.message);
  }

  return { id: userId };
}

export async function getTeamMember(
  id: string,
): Promise<{ id: string; role: string; email: string | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new DataError("team.profile.get", error.message);
  return data ? { ...data, role: data.role ?? "" } : null;
}

/** Admin count excluding one user, used to block removing the last admin. */
export async function countOtherAdmins(excludeId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .neq("id", excludeId);

  if (error) throw new DataError("team.admins.count", error.message);
  return count ?? 0;
}

export type MechanicLink = {
  mechanicId: number;
  userId: string;
  fullName: string;
  email: string | null;
};

/** Read-only map of mechanic → profile, used to label already-taken options. */
export async function listMechanicLinks(): Promise<MechanicLink[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, mechanic_id")
    .not("mechanic_id", "is", null);

  if (error) throw new DataError("team.mechanic.links", error.message);

  return (data ?? [])
    .filter((row) => row.mechanic_id !== null)
    .map((row) => ({
      mechanicId: row.mechanic_id as number,
      userId: row.id,
      fullName: row.full_name ?? "User",
      email: row.email,
    }));
}

export type UpdateTeamUserInput = {
  id: string;
  fullName: string;
  role: TeamRole;
  mechanicId: number | null;
};

export type MechanicOwner = {
  id: string;
  fullName: string;
  email: string | null;
};

/** `profiles.mechanic_id` is unique, so a mechanic can only belong to one user. */
export async function findMechanicOwner(
  mechanicId: number,
  excludeUserId?: string,
): Promise<MechanicOwner | null> {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("mechanic_id", mechanicId);

  if (excludeUserId) query = query.neq("id", excludeUserId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new DataError("team.mechanic.owner", error.message);

  return data
    ? { id: data.id, fullName: data.full_name ?? "User", email: data.email }
    : null;
}

export async function updateTeamUser(
  input: UpdateTeamUserInput,
  options: { reassignFromId?: string | null } = {},
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const reassignFromId = options.reassignFromId ?? null;

  if (reassignFromId) {
    const cleared = await admin
      .from("profiles")
      .update({ mechanic_id: null, date_updated: now })
      .eq("id", reassignFromId);

    if (cleared.error) {
      throw new DataError("team.mechanic.unlink", cleared.error.message);
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: input.role,
      mechanic_id: input.mechanicId,
      date_updated: now,
    })
    .eq("id", input.id);

  if (error) {
    // Old owner ka link wapas lagao taaki transfer adhoora na rahe.
    if (reassignFromId && input.mechanicId !== null) {
      await admin
        .from("profiles")
        .update({ mechanic_id: input.mechanicId })
        .eq("id", reassignFromId);
    }
    throw new DataError("team.profile.update", error.message);
  }
}

export async function resetTeamPassword(id: string, password: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) throw new DataError("team.auth.password", error.message);
}

/**
 * Auth user pehle delete hota hai taaki profile delete ke baad auth delete fail
 * ho kar account bina role ke na chhoote. Profile row cascade na ho to manually
 * clean karte hain.
 */
export async function deleteTeamUser(id: string) {
  const admin = createAdminClient();
  const removed = await admin.auth.admin.deleteUser(id);

  if (removed.error) {
    throw new DataError("team.auth.delete", removed.error.message);
  }

  const profile = await admin.from("profiles").delete().eq("id", id);
  if (profile.error) {
    throw new DataError("team.profile.delete", profile.error.message);
  }
}
