import { expect, test } from "@playwright/test";

import { hasCredentials, login } from "./helpers";

/**
 * Writes real rows. Default-off because v2 shares the live Supabase project
 * with vtech-frontend; opt in only with `E2E_MUTATIONS=1` AND an explicit
 * `E2E_ALLOW_LIVE_DB_WRITES=1` acknowledgement.
 */
const mutationsEnabled =
  process.env.E2E_MUTATIONS === "1" &&
  process.env.E2E_ALLOW_LIVE_DB_WRITES === "1";

test.describe("client CRUD (guarded)", () => {
  test.skip(!hasCredentials, "Credentials set nahi hain — CRUD skip.");
  test.skip(
    !mutationsEnabled,
    "Mutation guard: E2E_MUTATIONS=1 + E2E_ALLOW_LIVE_DB_WRITES=1 chahiye.",
  );

  test("client create → edit → soft delete", async ({ page }) => {
    const stamp = Date.now();
    const lastName = `E2E${stamp}`;

    await login(page);
    await page.goto("/clients/new");
    await page.getByLabel("First name *").fill("Playwright");
    await page.getByLabel("Last name *").fill(lastName);
    await page.getByLabel("Contact *").fill(`90000${String(stamp).slice(-5)}`);
    await page
      .getByLabel("Address *")
      .fill("E2E test address — safe to delete");
    await page.getByRole("button", { name: "Create client" }).click();

    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await expect(page.getByText(lastName)).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Address *").fill("E2E edited address");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("E2E edited address")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByText(lastName)).toHaveCount(0);
  });
});
