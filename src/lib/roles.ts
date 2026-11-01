export const APP_ROLES = ["admin", "staff", "developer", "client"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const STAFF_ROLE_SET = new Set<string>(["admin", "staff", "developer"]);

export function isStaffRole(role: string | null | undefined): role is AppRole {
  return typeof role === "string" && STAFF_ROLE_SET.has(role);
}

export function isAppRole(role: string | null | undefined): role is AppRole {
  return (
    typeof role === "string" && (APP_ROLES as readonly string[]).includes(role)
  );
}

/**
 * Settings writes are app-gated to admin only. The shared DB policy
 * (`hardening_sysinfo_staff`) also lets staff write and blocks developer, so
 * the app gate is the stricter, zero-DDL source of truth (plan §11.1).
 */
export function canManageSettings(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Soft/hard record deletes follow the v1 plan: admin + developer. */
export function canDeleteRecords(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

/** Auth-user creation uses the service-role key, so admin only. */
export function canManageTeam(role: string | null | undefined): boolean {
  return role === "admin";
}

/** `activity_logs` RLS only accepts writes from admin + staff. */
export function canWriteAuditLog(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff";
}
