"use client";

import { KeyRound, Pencil, Trash2, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserAction,
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
import { PasswordInput } from "@/components/ui/password-input";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import type { MechanicLink, TeamMember } from "@/lib/data/team";
import { formatIST } from "@/lib/date";
import { cn } from "@/lib/utils";

const initialState: SettingsActionState = { error: null };

const ROLE_BADGE: Record<string, "default" | "secondary" | "warning"> = {
  admin: "default",
  staff: "secondary",
  developer: "warning",
};

const PANEL_CLASS = "border-input bg-muted/30 mt-3 rounded-md border p-3";

type PanelMode = "edit" | "password" | "delete";
type OpenPanel = { id: string; mode: PanelMode } | null;

function Feedback({ state }: { state: SettingsActionState }) {
  return (
    <div className="grid gap-2 sm:col-span-2">
      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function Roles({
  id,
  defaultValue = "staff",
}: {
  id: string;
  defaultValue?: string;
}) {
  return (
    <Select id={id} name="role" defaultValue={defaultValue}>
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
      <option value="developer">Developer</option>
    </Select>
  );
}

export function TeamPanel({
  members,
  mechanics,
  mechanicLinks,
  canManage,
  currentUserId,
}: {
  members: TeamMember[];
  mechanics: Array<{ id: number; firstname: string; lastname: string }>;
  mechanicLinks: MechanicLink[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );
  const [editState, editAction, editPending] = useActionState(
    updateUserAction,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    resetUserPasswordAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUserAction,
    initialState,
  );
  const [panel, setPanel] = useState<OpenPanel>(null);

  const linkByMechanic = new Map(
    mechanicLinks.map((link) => [link.mechanicId, link]),
  );

  const mechanicOptions = (memberId?: string): SearchableOption[] =>
    mechanics.map((mechanic) => {
      const owner = linkByMechanic.get(mechanic.id);
      const takenByOther = owner && owner.userId !== memberId;
      return {
        value: String(mechanic.id),
        label: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
        hint: takenByOther ? `${owner.fullName} se linked` : undefined,
        keywords: owner?.fullName,
      };
    });

  const toggle = (id: string, mode: PanelMode) => {
    setPanel((current) =>
      current?.id === id && current.mode === mode ? null : { id, mode },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Auth user + `profiles` row dono yahin manage hote hain — edit,
            password reset aur delete sab admin-only hain.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {deleteState.message ? (
            <p className="border-success/30 bg-success/10 text-success mx-4 mb-2 rounded-md border px-3 py-2 text-sm">
              {deleteState.message}
            </p>
          ) : null}
          {members.length ? (
            <ul className="divide-y">
              {members.map((member) => {
                const isSelf = member.id === currentUserId;
                const mode = panel?.id === member.id ? panel.mode : null;

                return (
                  <li key={member.id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {member.fullName}
                          {isSelf ? (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                              (aap)
                            </span>
                          ) : null}
                        </p>
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
                      {canManage ? (
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant={mode === "edit" ? "secondary" : "ghost"}
                            size="icon"
                            className="size-8"
                            aria-label={`${member.fullName} edit karein`}
                            aria-expanded={mode === "edit"}
                            onClick={() => toggle(member.id, "edit")}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant={
                              mode === "password" ? "secondary" : "ghost"
                            }
                            size="icon"
                            className="size-8"
                            aria-label={`${member.fullName} ka password reset karein`}
                            aria-expanded={mode === "password"}
                            onClick={() => toggle(member.id, "password")}
                          >
                            <KeyRound className="size-4" aria-hidden />
                          </Button>
                          {isSelf ? null : (
                            <Button
                              type="button"
                              variant={
                                mode === "delete" ? "secondary" : "ghost"
                              }
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                              aria-label={`${member.fullName} delete karein`}
                              aria-expanded={mode === "delete"}
                              onClick={() => toggle(member.id, "delete")}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {mode === "edit" ? (
                      <form
                        action={editAction}
                        className={cn(PANEL_CLASS, "grid gap-3 sm:grid-cols-2")}
                      >
                        <input type="hidden" name="user_id" value={member.id} />
                        <div className="grid gap-1.5">
                          <Label htmlFor={`edit_name_${member.id}`}>
                            Full name
                          </Label>
                          <Input
                            id={`edit_name_${member.id}`}
                            name="full_name"
                            defaultValue={member.fullName}
                            required
                            minLength={2}
                            maxLength={80}
                            autoComplete="off"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`edit_email_${member.id}`}>
                            Email
                          </Label>
                          <Input
                            id={`edit_email_${member.id}`}
                            value={member.email ?? "—"}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`edit_role_${member.id}`}>Role</Label>
                          {isSelf ? (
                            <>
                              <input
                                type="hidden"
                                name="role"
                                value={member.role}
                              />
                              <Select
                                id={`edit_role_${member.id}`}
                                value={member.role}
                                disabled
                                aria-describedby={`edit_role_hint_${member.id}`}
                              >
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                                <option value="developer">Developer</option>
                              </Select>
                              <p
                                id={`edit_role_hint_${member.id}`}
                                className="text-muted-foreground text-xs"
                              >
                                Apna role khud nahi badal sakte.
                              </p>
                            </>
                          ) : (
                            <Roles
                              id={`edit_role_${member.id}`}
                              defaultValue={member.role}
                            />
                          )}
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`edit_mechanic_${member.id}`}>
                            Mechanic link (optional)
                          </Label>
                          <SearchableSelect
                            id={`edit_mechanic_${member.id}`}
                            name="mechanic_id"
                            defaultValue={
                              member.mechanicId ? String(member.mechanicId) : ""
                            }
                            placeholder="Koi nahi"
                            options={[
                              { value: "", label: "Koi nahi" },
                              ...mechanicOptions(member.id),
                            ]}
                          />
                          <label className="text-muted-foreground flex items-start gap-2 text-xs">
                            <input
                              type="checkbox"
                              name="reassign"
                              value="1"
                              className="accent-primary mt-0.5 size-3.5"
                            />
                            <span>
                              Mechanic pehle se kisi aur se linked ho to link
                              transfer kar dein.
                            </span>
                          </label>
                        </div>
                        <Feedback state={editState} />
                        <div className="flex gap-2 sm:col-span-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={editPending}
                          >
                            {editPending ? "Save ho raha…" : "Save karein"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPanel(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}

                    {mode === "password" ? (
                      <form
                        action={passwordAction}
                        className={cn(PANEL_CLASS, "grid gap-3")}
                      >
                        <input type="hidden" name="user_id" value={member.id} />
                        <div className="grid gap-1.5">
                          <Label htmlFor={`password_${member.id}`}>
                            Naya password ({member.fullName})
                          </Label>
                          <PasswordInput
                            id={`password_${member.id}`}
                            name="password"
                            required
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                          />
                          <p className="text-muted-foreground text-xs">
                            8–72 characters. Purana password turant band ho
                            jayega; user ko alag channel se share karein.
                          </p>
                        </div>
                        <Feedback state={passwordState} />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={passwordPending}
                          >
                            {passwordPending
                              ? "Set ho raha…"
                              : "Password set karein"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPanel(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}

                    {mode === "delete" ? (
                      <form
                        action={deleteAction}
                        className={cn(
                          PANEL_CLASS,
                          "border-destructive/30 bg-destructive/5 grid gap-3",
                        )}
                      >
                        <input type="hidden" name="user_id" value={member.id} />
                        <p className="text-sm">
                          <strong>{member.email ?? member.fullName}</strong> ka
                          auth login aur profile row permanently delete hoga. Ye
                          action undo nahi hota.
                        </p>
                        <Feedback state={deleteState} />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            disabled={deletePending}
                          >
                            {deletePending
                              ? "Delete ho raha…"
                              : "Haan, delete karein"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPanel(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
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
                <PasswordInput
                  id="team_password"
                  name="password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="team_role">Role</Label>
                <Roles id="team_role" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="team_mechanic">Mechanic link (optional)</Label>
                <SearchableSelect
                  id="team_mechanic"
                  name="mechanic_id"
                  placeholder="Koi nahi"
                  options={[
                    { value: "", label: "Koi nahi" },
                    ...mechanicOptions(),
                  ]}
                />
                <label className="text-muted-foreground flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    name="reassign"
                    value="1"
                    className="accent-primary mt-0.5 size-3.5"
                  />
                  <span>
                    Mechanic pehle se kisi aur se linked ho to link transfer kar
                    dein.
                  </span>
                </label>
              </div>

              <Feedback state={state} />

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
          User manage karne ka access sirf admin ke paas hai.
        </p>
      )}
    </div>
  );
}
