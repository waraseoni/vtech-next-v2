import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const email = process.env.E2E_EMAIL ?? process.env.APP_ADMIN_LOGIN;
export const password = process.env.E2E_PASSWORD ?? process.env.APP_PASSWORD;

export const hasCredentials = Boolean(email && password);

/** Collects CSP violations + uncaught errors logged by the browser. */
export function watchPageErrors(page: Page) {
  const problems: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && /content security policy/i.test(text)) {
      problems.push(text);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(error.message);
  });

  return problems;
}

export async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle").catch(() => undefined);

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    try {
      await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
      await expect(
        page.getByRole("heading", { level: 2, name: /Welcome back/ }),
      ).toBeVisible();
      return;
    } catch (error) {
      // Dev cold-compile: click hydration se pehle chala to reload ho jata hai.
      if (attempt === 1) throw error;
      await page.waitForLoadState("load");
    }
  }
}

/** Fails on axe critical/serious violations (local/dev only, no live writes). */
export async function expectNoSeriousA11y(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    serious.map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes.length} node(s)`,
    ),
    `axe findings on ${label}`,
  ).toEqual([]);
}
