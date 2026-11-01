import { expect, test } from "@playwright/test";

import {
  expectNoSeriousA11y,
  hasCredentials,
  login,
  watchPageErrors,
} from "./helpers";

test.describe("admin panel smoke", () => {
  test.skip(
    !hasCredentials,
    "E2E_EMAIL/E2E_PASSWORD (ya APP_ADMIN_LOGIN/APP_PASSWORD) set nahi hain — live smoke skip.",
  );

  test("login ke baad sabhi modules render hote hain", async ({ page }) => {
    const problems = watchPageErrors(page);
    await login(page);

    const routes: Array<[string, string]> = [
      ["/jobs", "Jobsheet"],
      ["/jobs/new", "New job"],
      ["/sales", "Sales"],
      ["/sales/new", "New sale"],
      ["/clients", "Clients"],
      ["/search", "Search"],
      ["/search?q=ac", "Search"],
      ["/attendance", "Attendance"],
      ["/attendance?view=month", "Attendance"],
      ["/profile", "My profile"],
      ["/settings", "Settings"],
      ["/settings?tab=attendance", "Settings"],
      ["/settings?tab=team", "Settings"],
      ["/settings?tab=system", "Settings"],
    ];

    for (const [path, heading] of routes) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { level: 2, name: heading, exact: true }),
      ).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Unhandled Runtime");
      await expectNoSeriousA11y(page, path);
    }

    expect(problems, "CSP violations / page errors").toEqual([]);
  });
});
