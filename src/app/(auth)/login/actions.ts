"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState = { error: string | null };

const LAST_EMAIL_COOKIE = "vtech_last_email";
const LAST_LOGIN_COOKIE = "vtech_last_login";
const REMEMBER_SECONDS = 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REMEMBER_SECONDS,
  };
}

function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: "Email ya password sahi format me nahi hai." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email ya password galat hai." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LAST_EMAIL_COOKIE, parsed.data.email, cookieOptions());
  cookieStore.set(LAST_LOGIN_COOKIE, new Date().toISOString(), cookieOptions());

  revalidatePath("/", "layout");
  redirect(safeNext(parsed.data.next));
}
