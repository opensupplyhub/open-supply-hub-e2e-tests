import { chromium } from "@playwright/test";
import { AdminPage } from "../pages/AdminPage";
import { LoginPage } from "../pages/LoginPage";

export const PRIVATE_INSTANCE_SWITCH_NAME = "private_instance";

/**
 * Toggles the private_instance waffle switch via Django admin → Switches
 * (/admin/waffle/switch/), then verifies Active is set as expected.
 * Tests should reload the main site after enabling (see goToFilteredFacilitiesSearchWithReload).
 */
export async function setPrivateInstanceMode(enabled: boolean): Promise<void> {
  const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  if (!BASE_URL || !USER_ADMIN_EMAIL || !USER_ADMIN_PASSWORD) {
    throw new Error("Missing env vars for waffle switch admin setup");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const loginPage = new LoginPage(page, BASE_URL);
  const adminPage = new AdminPage(page, BASE_URL);

  await loginPage.loginToAdminPanel(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD);
  await adminPage.setWaffleSwitchActive(PRIVATE_INSTANCE_SWITCH_NAME, enabled);
  await browser.close();
}

export async function resetPrivateInstanceMode(): Promise<void> {
  await setPrivateInstanceMode(false);
}
