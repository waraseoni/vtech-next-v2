import { CalendarClock, KeyRound, Mail, UserRound, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getMechanicName } from "@/lib/data/jobs";
import { formatIST } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

import { PasswordForm } from "./password-form";

export const metadata = { title: "Profile" };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  developer: "Developer",
  staff: "Staff",
  client: "Client",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return formatIST(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProfilePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const mechanicName = await getMechanicName(session.profile.mechanic_id);

  const name = session.profile.full_name ?? session.email ?? "User";
  const role = session.profile.role;

  const details = [
    { label: "Email", value: session.email ?? session.profile.email ?? "—" },
    { label: "Role", value: ROLE_LABEL[role] ?? role },
    {
      label: "Mechanic link",
      value:
        mechanicName ??
        (session.profile.mechanic_id
          ? `Mechanic #${session.profile.mechanic_id}`
          : "Not linked"),
    },
    { label: "Account created", value: fmtDateTime(user?.created_at) },
    { label: "Last sign in", value: fmtDateTime(user?.last_sign_in_at) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="text-muted-foreground text-sm">Account</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          My profile
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Aapki login details, role aur password — sab yahan se manage karein.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4 py-5">
          <CardContent className="px-5">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-full text-base font-semibold">
                {initialsOf(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{name}</p>
                <Badge variant={role === "staff" ? "secondary" : "default"}>
                  {ROLE_LABEL[role] ?? role}
                </Badge>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 border-t pt-4 text-sm">
              {details.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4"
                >
                  <dt className="text-muted-foreground flex items-center gap-2">
                    {item.label === "Email" ? (
                      <Mail className="size-3.5" aria-hidden />
                    ) : item.label === "Role" ? (
                      <UserRound className="size-3.5" aria-hidden />
                    ) : item.label === "Mechanic link" ? (
                      <Wrench className="size-3.5" aria-hidden />
                    ) : (
                      <CalendarClock className="size-3.5" aria-hidden />
                    )}
                    {item.label}
                  </dt>
                  <dd className="min-w-0 text-right font-medium break-words">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="size-4" aria-hidden />
              Change password
            </CardTitle>
            <CardDescription>
              Purana password verify hoga, phir naya password set hoga.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <PasswordForm />
            <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
              Ye shared Supabase login hai, isliye naya password V-Tech ke dono
              apps par lagu hoga.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
