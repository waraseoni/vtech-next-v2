"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error: string | null;
  message?: string;
};

const passwordSchema = z
  .object({
    current: z.string().min(1, "Purana password daalein."),
    password: z
      .string()
      .min(8, "Naya password kam se kam 8 characters ka ho.")
      .max(72, "Naya password 72 characters se chhota rakhein."),
    confirm: z.string(),
    signOutOthers: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Confirm password match nahi kar raha.",
  });

export async function updatePasswordAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    signOutOthers: formData.get("signOutOthers") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Password details check karein.",
    };
  }

  const session = await requireSession();
  const email = session.email;
  if (!email) {
    return { error: "Account email nahi mila; admin se contact karein." };
  }

  const { url, key } = getPublicEnv();
  const verifier = createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email,
    password: parsed.data.current,
  });

  if (verifyError) {
    return { error: "Purana password galat hai." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: /different from the old password/i.test(error.message)
        ? "Naya password purane se alag rakhein."
        : "Password update nahi ho paya. Dobara koshish karein.",
    };
  }

  let othersSignedOut = false;
  if (parsed.data.signOutOthers === "1") {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });
    othersSignedOut = !signOutError;
  }

  await recordActivity(session, {
    module: "Team",
    action: "update",
    metaId: session.profile.mechanic_id,
    details: "Password changed (self)",
  });
  revalidatePath("/profile");

  return {
    error: null,
    message: othersSignedOut
      ? "Password update ho gaya; baaki devices sign out ho gaye."
      : "Password update ho gaya.",
  };
}
