"use client";

import { UserPlus } from "lucide-react";
import { useActionState } from "react";

import {
  createUserAction,
  type SettingsActionState,
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TeamMember } from "@/lib/data/team";
import { formatIST } from "@/lib/date";

const initialState: SettingsActionState = { error: null };

const ROLE_BADGE: Record<string, "default" | "secondary" | "warning"> = {
  admin: "default",
  staff: "secondary",
  developer: "warning",
};

export function TeamPanel({
  members,
  mechanics,
  canManage,
}: {
  members: TeamMember[];
  mechanics: Array<{ id: number; firstname: string; lastname: string }>;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Profile rows shared DB ke `profiles` table se — role badalne ke liye
            Supabase dashboard use karein (app me role edit nahi).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {members.length ? (
            <ul className="divide-y">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.fullName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.email ?? "email nahi"}
                      {member.mechanicId
                        ? ` · mechanic #${member.mechanicId}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={ROLE_BADGE[member.role] ?? "secondary"}>
                    {member.role}
                  </Badge>
                  {member.updatedAt ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatIST(member.updatedAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-4 text-sm">
              Koi staff profile nahi mili.
            </p>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4" aria-hidden />
              Naya user
            </CardTitle>
            <CardDescription>
              Auth user + profile ek saath bante hain. Password user ko alag se
              share karein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="team_full_name">Full name</Label>
                <Input
                  id="team_full_name"
                  name="full_name"
                  required
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="team_email">Email</Label>
                <Input
                  id="team_email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="team_password">Temporary password</Label>
                <Input
                  id="team_password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="team_role">Role</Label>
                <Select id="team_role" name="role" defaultValue="staff">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="team_mechanic">Mechanic link (optional)</Label>
                <Select id="team_mechanic" name="mechanic_id" defaultValue="">
                  <option value="">Koi nahi</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {`${mechanic.firstname} ${mechanic.lastname}`.trim()}
                    </option>
                  ))}
                </Select>
              </div>

              {state.error ? (
                <p
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm sm:col-span-2"
                >
                  {state.error}
                </p>
              ) : null}
              {state.message ? (
                <p className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm sm:col-span-2">
                  {state.message}
                </p>
              ) : null}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Bana rahe hain…" : "User create karein"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="border-warning/30 bg-warning/10 text-warning rounded-md border px-3 py-2 text-sm">
          User create karne ka access sirf admin ke paas hai.
        </p>
      )}
    </div>
  );
}
