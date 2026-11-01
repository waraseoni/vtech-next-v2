import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? process.env.APP_ADMIN_LOGIN;
const password = process.env.E2E_PASSWORD ?? process.env.APP_PASSWORD;

test.describe("admin panel smoke", () => {
  test.skip(
    !email || !password,
    "E2E_EMAIL/E2E_PASSWORD (ya APP_ADMIN_LOGIN/APP_PASSWORD) set nahi hain — live smoke skip.",
  );

  test("login ke baad sabhi modules render hote hain", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { level: 2, name: /Welcome back/ }),
    ).toBeVisible();

    const routes: Array<[string, string]> = [
      ["/jobs", "Jobsheet"],
      ["/sales", "Sales"],
      ["/clients", "Clients"],
      ["/attendance", "Attendance"],
      ["/attendance?view=month", "Attendance"],
      ["/settings", "Settings"],
      ["/settings?tab=attendance", "Settings"],
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
    }
  });
});
