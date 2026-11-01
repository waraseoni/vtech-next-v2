import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  canDeleteRecords,
  canManageSettings,
  canManageTeam,
  canWriteAuditLog,
  isAppRole,
  isStaffRole,
} from "./roles";

describe("roles", () => {
  it("lists every persisted role", () => {
    expect(APP_ROLES).toEqual(["admin", "staff", "developer", "client"]);
  });

  it("recognises frontend staff only", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("staff")).toBe(true);
    expect(isStaffRole("developer")).toBe(true);
    expect(isStaffRole("client")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole("owner")).toBe(false);
  });

  it("matches DB RLS for settings writes (admin only in app)", () => {
    expect(canManageSettings("admin")).toBe(true);
    expect(canManageSettings("staff")).toBe(false);
    expect(canManageSettings("developer")).toBe(false);
  });

  it("keeps deletes and team management narrow", () => {
    expect(canDeleteRecords("admin")).toBe(true);
    expect(canDeleteRecords("developer")).toBe(true);
    expect(canDeleteRecords("staff")).toBe(false);
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("developer")).toBe(false);
  });

  it("mirrors activity_logs policy for audit writes", () => {
    expect(canWriteAuditLog("admin")).toBe(true);
    expect(canWriteAuditLog("staff")).toBe(true);
    expect(canWriteAuditLog("developer")).toBe(false);
    expect(canWriteAuditLog("client")).toBe(false);
  });

  it("narrows unknown role strings", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("owner")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
  });
});
