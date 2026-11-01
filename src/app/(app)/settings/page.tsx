import { Building2, Clock, Database, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { SettingsForm } from "@/components/settings/settings-form";
import { TeamPanel } from "@/components/settings/team-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getMechanicOptions } from "@/lib/data/jobs";
import { getSettings, getSystemInfo } from "@/lib/data/settings";
import { resolveMediaUrl } from "@/lib/data/storage";
import { listTeamMembers } from "@/lib/data/team";
import { getPublicEnv } from "@/lib/env";
import { canManageSettings, canManageTeam } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Settings" };

const TABS = [
  { id: "profile", label: "Business profile", icon: Building2 },
  { id: "attendance", label: "Attendance & geofence", icon: Clock },
  { id: "team", label: "Team & users", icon: Users },
  { id: "system", label: "System info", icon: Database },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const session = await requireSession();
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : "";
  const tab: SettingsTab =
    tabParam === "attendance" || tabParam === "team" || tabParam === "system"
      ? tabParam
      : "profile";
  const canEdit = canManageSettings(session.profile.role);
  const canWriteTab =
    tab === "team" ? canManageTeam(session.profile.role) : canEdit;

  const [settings, systemInfo, teamMembers, mechanics] = await Promise.all([
    tab === "system" || tab === "team"
      ? Promise.resolve<Record<string, string>>({})
      : getSettings(),
    tab === "system" ? getSystemInfo() : Promise.resolve(null),
    tab === "team" ? listTeamMembers() : Promise.resolve([]),
    tab === "team" ? getMechanicOptions() : Promise.resolve([]),
  ]);

  const supabaseUrl = getPublicEnv().url;
  const logoUrl = resolveMediaUrl(settings.logo, supabaseUrl);
  const coverUrl = resolveMediaUrl(settings.cover, supabaseUrl);
  const businessName =
    settings.name?.trim() || settings.short_name?.trim() || "V-Tech";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <p className="text-muted-foreground text-sm">Configuration</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {businessName} · shared DB ke existing `system_info` fields
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={`/settings?tab=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "hover:bg-muted border-input",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <Badge
          variant={canWriteTab ? "success" : "warning"}
          className="ml-auto"
        >
          {canWriteTab ? "Write access" : "Read-only"}
        </Badge>
      </div>

      {tab === "system" ? (
        systemInfo ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "App version", value: systemInfo.appVersion },
                { label: "Environment", value: systemInfo.nodeEnv },
                { label: "Supabase host", value: systemInfo.supabaseHost },
                { label: "DB latency", value: `${systemInfo.dbMs} ms` },
                { label: "Jobs", value: systemInfo.counts.jobs },
                { label: "Clients", value: systemInfo.counts.clients },
                { label: "Direct sales", value: systemInfo.counts.sales },
                { label: "Mechanics", value: systemInfo.counts.mechanics },
                {
                  label: "Attendance rows",
                  value: systemInfo.counts.attendance,
                },
              ].map((item) => (
                <Card key={item.label} className="gap-1 py-3">
                  <CardContent className="px-4">
                    <p className="text-muted-foreground text-xs">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                      {typeof item.value === "number"
                        ? new Intl.NumberFormat("en-IN").format(item.value)
                        : item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data & safety</CardTitle>
                <CardDescription>
                  Zero-migration policy: shared DB me koi schema change nahi.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <ShieldCheck
                    className="text-success mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  Secrets (`ai_api_key`, `csrf_token`) kabhi render nahi hote —
                  sirf whitelisted public fields read/write hote hain.
                </p>
                <p>
                  Settings writes app-level admin gate se hote hain. Shared DB
                  policy (`hardening_sysinfo_staff`) staff ko bhi write deti hai
                  aur developer ko block karti hai — isliye app gate admin-only
                  rakha gaya hai (zero-DDL).
                </p>
                <p>
                  Uploads `media` bucket (public read, staff write) me jaate
                  hain aur `next/image` par `unoptimized` render hote hain.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null
      ) : tab === "team" ? (
        <TeamPanel
          members={teamMembers}
          mechanics={mechanics}
          canManage={canManageTeam(session.profile.role)}
        />
      ) : (
        <SettingsForm
          tab={tab}
          settings={settings}
          canEdit={canEdit}
          logoUrl={logoUrl}
          coverUrl={coverUrl}
        />
      )}
    </div>
  );
}
