import "server-only";

import type { SessionProfile } from "@/lib/auth";
import { canWriteAuditLog } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type AuditModule =
  "Clients" | "Jobs" | "Sales" | "Attendance" | "Settings" | "Team";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "status"
  | "check-in"
  | "check-out"
  | "upload";

export type AuditEntry = {
  module: AuditModule;
  action: AuditAction;
  metaId?: string | number | null;
  details?: string | null;
  geo?: { lat: number; lng: number; distanceM?: number | null } | null;
};

const MAX_DETAILS = 500;

/**
 * Best-effort audit trail over the existing `activity_logs` table (zero DDL).
 * RLS only accepts admin/staff writers, and a failed log must never fail the
 * user's mutation, so every failure is swallowed after a console warning.
 */
export async function recordActivity(
  session: SessionProfile | null,
  entry: AuditEntry,
): Promise<void> {
  if (!session || !canWriteAuditLog(session.profile.role)) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("activity_logs").insert({
      user_id: session.profile.mechanic_id ?? null,
      action: entry.action,
      module: entry.module,
      meta_id: entry.metaId != null ? String(entry.metaId) : null,
      details: entry.details?.slice(0, MAX_DETAILS) ?? null,
      geo_lat: entry.geo?.lat ?? null,
      geo_lng: entry.geo?.lng ?? null,
      geo_distance_m: entry.geo?.distanceM ?? null,
    });
    if (error) {
      console.warn(
        `activity_logs ${entry.module}.${entry.action}: ${error.message}`,
      );
    }
  } catch (error) {
    console.warn(`activity_logs ${entry.module}.${entry.action} failed`, error);
  }
}
