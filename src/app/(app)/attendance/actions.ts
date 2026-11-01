"use server";

import { revalidatePath } from "next/cache";

import { isStaffRole, requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import {
  getGeofence,
  saveAttendance,
  selfCheckIn,
  selfCheckOut,
  type AttendanceUpsertInput,
} from "@/lib/data/attendance";
import { DataError } from "@/lib/data/errors";
import { isValidDateString } from "@/lib/date";
import { evaluateGeofence, type LatLng } from "@/lib/domain/geo";
import { normTime } from "@/lib/domain/duty";
import { canManageAttendance } from "@/lib/roles";

export type AttendanceActionState = {
  error: string | null;
  message?: string;
};

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof DataError) {
    return error.message.replace(/^[\w.]+:\s*/, "");
  }
  return fallback;
}

function parseStatus(value: FormDataEntryValue | null): number | null {
  const status = Number(value);
  return Number.isInteger(status) && status >= 0 && status <= 3 ? status : null;
}

function parseTime(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return normTime(value) || null;
}

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function saveAttendanceAction(
  _previous: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const session = await requireSession();
  if (!canManageAttendance(session.profile.role)) {
    return {
      error:
        "Attendance edit sirf admin kar sakta hai. Staff apna check-in/out hi kar sakta hai.",
    };
  }

  const date = String(formData.get("date") ?? "");
  if (!isValidDateString(date)) {
    return { error: "Date sahi nahi hai." };
  }

  const ids = String(formData.get("mechanic_ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  if (!ids.length) return { error: "Koi mechanic nahi mila." };

  const rows: AttendanceUpsertInput[] = [];
  for (const mechanicId of ids) {
    const status = parseStatus(formData.get(`status_${mechanicId}`));
    if (status === null) {
      return { error: "Kisi mechanic ka status sahi nahi hai." };
    }
    rows.push({
      mechanicId,
      date,
      status,
      timeIn: status === 2 ? null : parseTime(formData.get(`in_${mechanicId}`)),
      timeOut:
        status === 2 ? null : parseTime(formData.get(`out_${mechanicId}`)),
    });
  }

  try {
    await saveAttendance(rows);
  } catch (error) {
    return { error: friendlyError(error, "Attendance save nahi hui.") };
  }

  await recordActivity(session, {
    module: "Attendance",
    action: "update",
    metaId: date,
    details: `${rows.length} mechanic attendance`,
  });

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return {
    error: null,
    message: `${rows.length} mechanic ki attendance save ho gayi.`,
  };
}

export async function selfPunchAction(
  _previous: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Check-in ka access nahi hai." };
  }
  if (!session.profile.mechanic_id) {
    return {
      error:
        "Is account se koi mechanic linked nahi hai. Admin se profile link karwayein.",
    };
  }

  const direction = formData.get("direction");
  if (direction !== "in" && direction !== "out") {
    return { error: "Direction sahi nahi hai." };
  }

  const lat = parseCoordinate(formData.get("lat"));
  const lng = parseCoordinate(formData.get("lng"));
  const point: LatLng | null =
    lat !== null && lng !== null ? { lat, lng } : null;

  const fence = await getGeofence();
  const check = evaluateGeofence(fence, point);
  if (!check.ok) return { error: check.message };

  const geo = point ? { lat: point.lat, lng: point.lng } : {};
  try {
    const result =
      direction === "in"
        ? await selfCheckIn({
            mechanicId: session.profile.mechanic_id,
            ...geo,
          })
        : await selfCheckOut({
            mechanicId: session.profile.mechanic_id,
            ...geo,
          });

    if ("error" in result && result.error) return { error: result.error };

    if (!result.alreadyMarked) {
      await recordActivity(session, {
        module: "Attendance",
        action: direction === "in" ? "check-in" : "check-out",
        metaId: session.profile.mechanic_id,
        details: point ? `${point.lat}, ${point.lng}` : "Location nahi mili",
        geo:
          point && check.distanceM !== null
            ? { lat: point.lat, lng: point.lng, distanceM: check.distanceM }
            : null,
      });
    }

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return {
      error: null,
      message: result.alreadyMarked
        ? "Aaj ki entry pehle se hai."
        : direction === "in"
          ? "Check-in ho gaya."
          : "Check-out ho gaya.",
    };
  } catch (error) {
    return { error: friendlyError(error, "Punch save nahi hua.") };
  }
}
