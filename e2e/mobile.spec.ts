import { expect, test } from "@playwright/test";

import { hasCredentials, login, watchPageErrors } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile layout", () => {
  test.skip(!hasCredentials, "Credentials set nahi hain — mobile check skip.");

  test("attendance, settings, search aur job form 390px par overflow nahi karte", async ({
    page,
  }) => {
    const problems = watchPageErrors(page);
    await login(page);

    for (const path of [
      "/attendance",
      "/attendance?view=month",
      "/settings",
      "/settings?tab=team",
      "/search?q=ac",
      "/jobs/new",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `test-results/mobile-${path.replace(/\W+/g, "-").replace(/^-|-$/g, "")}.png`,
        fullPage: true,
      });
    }

    expect(problems, "CSP violations / page errors").toEqual([]);
  });
});
