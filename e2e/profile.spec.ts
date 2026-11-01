import { expect, test } from "@playwright/test";

import {
  expectNoSeriousA11y,
  hasCredentials,
  login,
  watchPageErrors,
} from "./helpers";

test.skip(!hasCredentials, "creds missing");

test("profile page account info aur password form dikhata hai", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await login(page);

  await expect(
    page.getByRole("link", { name: "Profile", exact: true }),
  ).toBeVisible();

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { level: 2, name: "My profile", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Email", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Change password", { exact: true }),
  ).toBeVisible();

  const current = page.getByLabel("Purana password");
  await expect(current).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Password dikhayein" })
    .first()
    .click();
  await expect(current).toHaveAttribute("type", "text");

  await expectNoSeriousA11y(page, "profile");
  expect(errors).toEqual([]);
});
