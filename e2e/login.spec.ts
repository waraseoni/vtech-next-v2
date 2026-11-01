import { expect, test } from "@playwright/test";

import { email, hasCredentials, login } from "./helpers";

test.describe("login", () => {
  test.skip(!hasCredentials, "E2E_EMAIL/E2E_PASSWORD set nahi hain.");

  test("password eye toggle aur pichhli login yaad rehti hai", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const password = page.locator("#password");
    await password.fill("temp-secret-123");
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Password dikhayein" }).click();
    await expect(password).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Password chhupayein" }).click();
    await expect(password).toHaveAttribute("type", "password");

    await login(page);

    const cookies = await context.cookies();
    const remembered = cookies.find(
      (cookie) => cookie.name === "vtech_last_email",
    );
    expect(remembered ? decodeURIComponent(remembered.value) : null).toBe(
      email,
    );
    expect(
      cookies.find((cookie) => cookie.name === "vtech_last_login")?.value,
    ).toBeTruthy();

    // Simulate logout without dropping the "remembered login" cookies.
    for (const cookie of cookies.filter((item) =>
      item.name.startsWith("sb-"),
    )) {
      await context.clearCookies({ name: cookie.name });
    }
    await page.goto("/login");

    await expect(page.locator("#email")).toHaveValue(email!);
    await expect(page.getByText(/Pichhli login:/)).toBeVisible();
    await expect(page.getByText(email!)).toBeVisible();
  });
});
