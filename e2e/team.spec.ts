import { expect, test } from "@playwright/test";

import {
  expectNoSeriousA11y,
  hasCredentials,
  login,
  watchPageErrors,
} from "./helpers";

test.describe("team management", () => {
  test.skip(
    !hasCredentials,
    "E2E_EMAIL/E2E_PASSWORD (ya APP_ADMIN_LOGIN/APP_PASSWORD) set nahi hain.",
  );

  test("edit/password panels khulte hain aur self-guards lagte hain", async ({
    page,
  }) => {
    const errors = watchPageErrors(page);

    await login(page);
    await page.goto("/settings?tab=team");
    await expect(page.getByText("Team members", { exact: true })).toBeVisible();

    const selfRow = page.locator("li").filter({ hasText: "(aap)" });
    await expect(selfRow).toHaveCount(1);
    // Legacy profile rows have email = null; the auth email must still render.
    await expect(selfRow).toContainText("@");
    await expect(selfRow).not.toContainText("email nahi");

    // Delete self is hidden outright.
    await expect(
      selfRow.getByRole("button", { name: /delete karein/ }),
    ).toHaveCount(0);

    await selfRow.getByRole("button", { name: /edit karein/ }).click();
    await expect(selfRow.getByLabel("Full name")).toBeVisible();
    await expect(selfRow.getByLabel("Role")).toBeDisabled();
    await expect(
      selfRow.getByText("Apna role khud nahi badal sakte."),
    ).toBeVisible();
    await expectNoSeriousA11y(page, "team edit panel");

    await selfRow
      .getByRole("button", { name: /password reset karein/ })
      .click();
    const newPassword = selfRow.getByLabel(/Naya password/);
    await expect(newPassword).toBeVisible();
    await expect(newPassword).toHaveAttribute("type", "password");
    await selfRow.getByRole("button", { name: "Password dikhayein" }).click();
    await expect(newPassword).toHaveAttribute("type", "text");
    await expect(selfRow.getByLabel("Full name")).toHaveCount(0);

    await selfRow.getByRole("button", { name: "Cancel" }).click();
    await expect(selfRow.getByLabel(/Naya password/)).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
