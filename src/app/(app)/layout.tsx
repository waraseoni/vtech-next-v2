import { ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isStaffRole, requireSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/data/settings";
import { resolveMediaUrl } from "@/lib/data/storage";
import { getPublicEnv } from "@/lib/env";

import { logout } from "./actions";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (!isStaffRole(session.profile.role)) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <span className="bg-destructive/10 text-destructive mb-2 grid size-10 place-items-center rounded-lg">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              Is account ke paas admin panel ka access nahi hai. Staff se
              contact karein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const name = session.profile.full_name ?? session.email ?? "User";
  const settings = await getPublicSettings();
  const brand = {
    name: settings.name?.trim() || settings.short_name?.trim() || "V-Tech",
    logoUrl: resolveMediaUrl(settings.logo, getPublicEnv().url),
  };

  return (
    <AppShell
      brand={brand}
      user={{ name, role: session.profile.role, initials: initialsOf(name) }}
    >
      {children}
    </AppShell>
  );
}
