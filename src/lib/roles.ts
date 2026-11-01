export const APP_ROLES = ["admin", "staff", "developer", "client"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const TEAM_ROLES = ["admin", "staff", "developer"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

const STAFF_ROLE_SET = new Set<string>(TEAM_ROLES);

export function isStaffRole(role: string | null | undefined): role is AppRole {
  return typeof role === "string" && STAFF_ROLE_SET.has(role);
}

export function isTeamRole(role: string | null | undefined): role is TeamRole {
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

/**
 * Settings are visible to admin + developer only. Staff never sees the module
 * in nav or by direct URL. Writes stay admin-only (`canManageSettings`).
 */
export function canViewSettings(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

/**
 * Revenue, income, dues and salary totals are business-sensitive, so staff
 * only gets operational record amounts (job/sale invoices it creates). This is
 * a UI gate; RLS in the shared DB is unchanged (zero-DDL policy).
 */
export function canViewFinancials(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

/** Soft/hard record deletes follow the v1 plan: admin + developer. */
export function canDeleteRecords(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

/**
 * Attendance edits (any date, any mechanic) are admin/developer only.
 * Staff accounts are self-service: current day + server-timestamped punches.
 */
export function canManageAttendance(role: string | null | undefined): boolean {
  return role === "admin" || role === "developer";
}

/** Staff see only their own current-day attendance and can only punch in/out. */
export function isSelfServiceAttendance(
  role: string | null | undefined,
): boolean {
  return role === "staff";
}

/** Auth-user creation uses the service-role key, so admin only. */
export function canManageTeam(role: string | null | undefined): boolean {
  return role === "admin";
}

/** `activity_logs` RLS only accepts writes from admin + staff. */
export function canWriteAuditLog(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff";
}
