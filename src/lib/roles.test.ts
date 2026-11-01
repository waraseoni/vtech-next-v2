import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  canDeleteRecords,
  canManageAttendance,
  canManageSettings,
  canManageTeam,
  canViewFinancials,
  canViewSettings,
  canWriteAuditLog,
  isAppRole,
  isSelfServiceAttendance,
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

  it("hides settings and financial totals from staff", () => {
    expect(canViewSettings("admin")).toBe(true);
    expect(canViewSettings("developer")).toBe(true);
    expect(canViewSettings("staff")).toBe(false);
    expect(canViewSettings("client")).toBe(false);

    expect(canViewFinancials("admin")).toBe(true);
    expect(canViewFinancials("developer")).toBe(true);
    expect(canViewFinancials("staff")).toBe(false);
    expect(canViewFinancials(null)).toBe(false);
  });

  it("keeps deletes and team management narrow", () => {
    expect(canDeleteRecords("admin")).toBe(true);
    expect(canDeleteRecords("developer")).toBe(true);
    expect(canDeleteRecords("staff")).toBe(false);
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("developer")).toBe(false);
  });

  it("keeps attendance editing admin/developer and self-service staff", () => {
    expect(canManageAttendance("admin")).toBe(true);
    expect(canManageAttendance("developer")).toBe(true);
    expect(canManageAttendance("staff")).toBe(false);
    expect(canManageAttendance("client")).toBe(false);

    expect(isSelfServiceAttendance("staff")).toBe(true);
    expect(isSelfServiceAttendance("admin")).toBe(false);
    expect(isSelfServiceAttendance("developer")).toBe(false);
    expect(isSelfServiceAttendance(null)).toBe(false);
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
