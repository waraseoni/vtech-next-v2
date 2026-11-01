"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import { DataError } from "@/lib/data/errors";
import { saveSettings, type SettingsMap } from "@/lib/data/settings";
import { uploadMediaImage } from "@/lib/data/storage";
import { createTeamUser } from "@/lib/data/team";
import { isValidDuty, normTime } from "@/lib/domain/duty";
import { canManageSettings, canManageTeam } from "@/lib/roles";

export type SettingsActionState = {
  error: string | null;
  message?: string;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name zaroori hai.")
    .max(80, "Business name 80 characters se chhota rakhein."),
  short_name: z.string().trim().max(30),
  owner: z.string().trim().max(80),
  email: z.union([z.literal(""), z.email("Email sahi nahi hai.")]),
  contact: z.string().trim().max(30),
  address: z.string().trim().max(300),
  gst_no: z.string().trim().max(20),
  upi_id: z.string().trim().max(80),
  footer_text: z.string().trim().max(200),
  announcement: z.string().trim().max(300),
  whatsapp: z.string().trim().max(200),
  facebook: z.string().trim().max(200),
  instagram: z.string().trim().max(200),
  youtube: z.string().trim().max(200),
  map_url: z.string().trim().max(500),
});

const attendanceSchema = z.object({
  biz_open: z.string().trim(),
  biz_close: z.string().trim(),
  biz_days: z.string().trim().max(50),
  geofence_enabled: z.enum(["0", "1"]),
  geofence_lat: z.string().trim(),
  geofence_lng: z.string().trim(),
  geofence_radius_m: z.string().trim(),
});

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof DataError) {
    const message = error.message.replace(/^[\w.]+:\s*/, "");
    if (/already|registered|exists/i.test(message)) {
      return "Ye email pehle se registered hai.";
    }
    return message;
  }
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    if (error.message.includes("SUPABASE_SECRET_KEY")) {
      return "Server par service-role key set nahi hai (SUPABASE_SECRET_KEY).";
    }
    return error.message;
  }
  return fallback;
}

async function optionFile(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function saveSettingsAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await requireSession();
  if (!canManageSettings(session.profile.role)) {
    return { error: "Settings save karne ka access sirf admin ke paas hai." };
  }

  const tab = formData.get("tab");
  if (tab !== "profile" && tab !== "attendance") {
    return { error: "Settings tab sahi nahi hai." };
  }

  try {
    const entries: SettingsMap =
      tab === "profile"
        ? await parseProfile(formData)
        : parseAttendance(formData);

    await saveSettings(entries);
    await recordActivity(session, {
      module: "Settings",
      action: "update",
      metaId: tab,
      details: Object.keys(entries).join(", "),
    });
    updateTag("system-info");
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { error: null, message: "Settings save ho gayi." };
  } catch (error) {
    return { error: friendlyError(error, "Settings save nahi hui.") };
  }
}

const teamSchema = z.object({
  email: z.email("Email sahi nahi hai."),
  password: z.string().min(8, "Password kam se kam 8 characters ka rakhein."),
  full_name: z
    .string()
    .trim()
    .min(2, "Full name likhiye.")
    .max(80, "Full name 80 characters se chhota rakhein."),
  role: z.enum(["admin", "staff", "developer"]),
  mechanic_id: z.string().trim(),
});

export async function createUserAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await requireSession();
  if (!canManageTeam(session.profile.role)) {
    return { error: "User create karne ka access sirf admin ke paas hai." };
  }

  try {
    const parsed = teamSchema.parse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      full_name: String(formData.get("full_name") ?? ""),
      role: String(formData.get("role") ?? ""),
      mechanic_id: String(formData.get("mechanic_id") ?? ""),
    });

    const mechanicId = parsed.mechanic_id ? Number(parsed.mechanic_id) : null;
    if (
      mechanicId !== null &&
      (!Number.isSafeInteger(mechanicId) || mechanicId <= 0)
    ) {
      return { error: "Mechanic selection sahi nahi hai." };
    }

    const created = await createTeamUser({
      email: parsed.email,
      password: parsed.password,
      fullName: parsed.full_name,
      role: parsed.role,
      mechanicId,
    });

    await recordActivity(session, {
      module: "Team",
      action: "create",
      metaId: created.id,
      details: `${parsed.email} · ${parsed.role}`,
    });

    revalidatePath("/settings");
    return {
      error: null,
      message: `${parsed.email} ka account ban gaya (${parsed.role}).`,
    };
  } catch (error) {
    return { error: friendlyError(error, "User create nahi hua.") };
  }
}

async function parseProfile(formData: FormData): Promise<SettingsMap> {
  const text = (name: string) => String(formData.get(name) ?? "");
  const parsed = profileSchema.parse({
    name: text("name"),
    short_name: text("short_name"),
    owner: text("owner"),
    email: text("email"),
    contact: text("contact"),
    address: text("address"),
    gst_no: text("gst_no"),
    upi_id: text("upi_id"),
    footer_text: text("footer_text"),
    announcement: text("announcement"),
    whatsapp: text("whatsapp"),
    facebook: text("facebook"),
    instagram: text("instagram"),
    youtube: text("youtube"),
    map_url: text("map_url"),
  });

  const entries: SettingsMap = { ...parsed };

  for (const field of ["logo", "cover"] as const) {
    const file = await optionFile(formData, `${field}_file`);
    if (file) {
      const uploaded = await uploadMediaImage(file, "settings");
      entries[field] = uploaded.url;
    }
  }

  return entries;
}

function parseAttendance(formData: FormData): SettingsMap {
  const parsed = attendanceSchema.parse({
    biz_open: formData.get("biz_open"),
    biz_close: formData.get("biz_close"),
    biz_days: formData.get("biz_days"),
    geofence_enabled: formData.get("geofence_enabled") ? "1" : "0",
    geofence_lat: formData.get("geofence_lat"),
    geofence_lng: formData.get("geofence_lng"),
    geofence_radius_m: formData.get("geofence_radius_m"),
  });

  const entries: SettingsMap = {
    biz_days: parsed.biz_days,
    geofence_enabled: parsed.geofence_enabled,
    geofence_radius_m: parsed.geofence_radius_m || "200",
  };

  if (parsed.biz_open || parsed.biz_close) {
    const start = normTime(parsed.biz_open);
    const end = normTime(parsed.biz_close);
    if (!start || !end || !isValidDuty({ start, end, breakMinutes: 0 })) {
      throw new Error(
        "Business hours sahi nahi hain (open aur close chahiye).",
      );
    }
    entries.biz_open = start;
    entries.biz_close = end;
  }

  const enabled = parsed.geofence_enabled === "1";
  const lat = parsed.geofence_lat ? Number(parsed.geofence_lat) : null;
  const lng = parsed.geofence_lng ? Number(parsed.geofence_lng) : null;
  const latValid = lat !== null && Number.isFinite(lat) && Math.abs(lat) <= 90;
  const lngValid = lng !== null && Number.isFinite(lng) && Math.abs(lng) <= 180;

  if (enabled && (!latValid || !lngValid)) {
    throw new Error(
      "Geofence on karne ke liye valid latitude/longitude chahiye.",
    );
  }

  if (latValid && lngValid) {
    entries.geofence_lat = String(lat);
    entries.geofence_lng = String(lng);
  } else if (!enabled) {
    entries.geofence_lat = "";
    entries.geofence_lng = "";
  }

  if (parsed.geofence_radius_m) {
    const radius = Number(parsed.geofence_radius_m);
    if (!Number.isFinite(radius) || radius < 20 || radius > 5000) {
      throw new Error("Radius 20 se 5000 metre ke beech hona chahiye.");
    }
    entries.geofence_radius_m = String(Math.round(radius));
  }

  return entries;
}
