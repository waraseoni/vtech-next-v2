/**
 * Lighthouse CI login hook. Runs only when `LHCI_AUTHED=1`; credentials come
 * from E2E_EMAIL/E2E_PASSWORD (or APP_ADMIN_LOGIN/APP_PASSWORD). Read-only:
 * it just signs in and lets LHCI audit the authed pages.
 */
const baseURL = process.env.LHCI_BASE_URL ?? "http://localhost:3000";

module.exports = async function loginForLighthouse(browser) {
  const email = process.env.E2E_EMAIL ?? process.env.APP_ADMIN_LOGIN;
  const password = process.env.E2E_PASSWORD ?? process.env.APP_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "LHCI_AUTHED=1 ke liye E2E_EMAIL/E2E_PASSWORD (ya APP_ADMIN_LOGIN/APP_PASSWORD) chahiye.",
    );
  }

  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.warn(`[lhci-auth] console: ${message.text().slice(0, 200)}`);
    }
  });

  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle0" });

  // LHCI reuses one browser for every URL, so after the first run the session
  // cookie is still present and /login redirects straight to /dashboard.
  if (new URL(page.url()).pathname !== "/login") {
    await page.close();
    return;
  }

  try {
    await page.waitForSelector("#email", { timeout: 20_000 });
  } catch (error) {
    const html = await page.content();
    console.warn(`[lhci-auth] url=${page.url()} html=${html.slice(0, 400)}`);
    throw error;
  }
  await page.type("#email", email);
  await page.type("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => window.location.pathname.startsWith("/dashboard"),
    { timeout: 30_000 },
  );
  await page.close();
};
