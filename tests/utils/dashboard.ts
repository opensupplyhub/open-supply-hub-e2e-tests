import { Page, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";

export async function acceptCookiesIfPresent(page: Page) {
  const accept = page.getByRole("button", { name: /^accept$/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

export async function loginViaAuthPage(
  page: Page,
  email: string,
  password: string,
) {
  const { BASE_URL } = process.env;
  await page.goto(`${BASE_URL}/auth/login`);
  await acceptCookiesIfPresent(page);
  await page.locator("#LOGIN_EMAIL").fill(email);
  await page.locator("#LOGIN_PASSWORD").fill(password);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await page.getByRole("button", { name: "My Account" }).waitFor({
    state: "visible",
    timeout: 30000,
  });
}

export async function loginAdminToDashboard(
  page: Page,
  adminEmail = process.env.USER_ADMIN_EMAIL!,
  adminPassword = process.env.USER_ADMIN_PASSWORD!,
): Promise<DashboardPage> {
  const { BASE_URL } = process.env;
  await loginViaAuthPage(page, adminEmail, adminPassword);
  const dashboard = new DashboardPage(page, BASE_URL!);
  await dashboard.goToDashboard();
  await dashboard.expectModeratorDashboard();
  return dashboard;
}

export async function logoutViaMyAccount(page: Page) {
  const myAccount = page.getByRole("button", { name: "My Account" });
  if (!(await myAccount.isVisible().catch(() => false))) {
    await page.context().clearCookies();
    return;
  }

  await myAccount.click();
  const logout = page.getByRole("button", { name: /log out/i });
  await logout.waitFor({ state: "visible", timeout: 10000 });

  const logoutResponse = page
    .waitForResponse(
      (resp) => resp.url().includes("/user-logout/"),
      { timeout: 10000 },
    )
    .catch(() => null);

  await logout.click({ force: true });
  await logoutResponse;

  const loginLink = page.getByRole("link", { name: "Login/Register" });
  if (!(await loginLink.isVisible().catch(() => false))) {
    await page.context().clearCookies();
    await page.goto(`${process.env.BASE_URL}/`);
    await acceptCookiesIfPresent(page);
  }

  await expect(
    page.getByRole("link", { name: "Login/Register" }),
  ).toBeVisible({ timeout: 15000 });
}

export async function loginRegularUser(
  page: Page,
  email = process.env.USER_EMAIL!,
  password = process.env.USER_PASSWORD!,
) {
  await loginViaAuthPage(page, email, password);
}

export async function clearSession(page: Page) {
  await page.context().clearCookies();
}
