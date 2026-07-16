import { Page } from "@playwright/test";
import { ModerationQueuePage } from "../pages/ModerationQueuePage";

export function uniqueSlcLocationName(prefix = "E2E SLC"): string {
  return `${prefix} ${Date.now()}`;
}

export async function loginAdminToModerationQueue(
  page: Page,
  baseUrl: string,
  adminEmail: string,
  adminPassword: string,
): Promise<ModerationQueuePage> {
  const moderationQueuePage = new ModerationQueuePage(page, baseUrl);

  await moderationQueuePage.goToModerationQueue();

  const acceptCookies = page.getByRole("button", { name: /^accept$/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }

  const moderationHeading = page.getByRole("heading", {
    name: "Dashboard / Moderation Queue",
  });
  if (await moderationHeading.isVisible().catch(() => false)) {
    return moderationQueuePage;
  }

  const signInLink = page.getByRole("link", {
    name: "Sign in to view your Open Supply Hub Dashboard",
  });

  if (!(await signInLink.isVisible().catch(() => false))) {
    const myAccountButton = page.getByRole("button", { name: "My Account" });
    if (await myAccountButton.isVisible().catch(() => false)) {
      await page.context().clearCookies();
      await moderationQueuePage.goToModerationQueue();
      await page.waitForLoadState("networkidle");
    }
  }

  const signInToDashboard = page.getByRole("link", {
    name: "Sign in to view your Open Supply Hub Dashboard",
  });
  await signInToDashboard.waitFor({ state: "visible", timeout: 15000 });
  await signInToDashboard.click();
  await page.getByRole("heading", { name: "Log In" }).waitFor({ state: "visible" });

  await page.getByLabel("Email").fill(adminEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(adminPassword);
  await page.getByRole("button", { name: "Log In" }).click();

  await page.waitForResponse(
    (resp) => resp.url().includes("/user-login/") && resp.status() === 200,
  );
  await page.waitForLoadState("networkidle");

  await moderationQueuePage.goToModerationQueue();
  await moderationQueuePage.expectModerationQueuePage();

  return moderationQueuePage;
}
