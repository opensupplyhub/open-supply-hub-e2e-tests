import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

test.beforeAll(setup);

test.describe("[@Regression] OSDEV-2195 Moderation Queue - Authentication and Access", () => {
  test("[@Regression] OSDEV-2195-1: Verify regular user sees 'Not found' after authentication", async ({ page }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    
    const loginPage = new LoginPage(page, BASE_URL!);
    const adminDashboardPage = new AdminDashboardPage(page, BASE_URL!);
    
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectSignInLinkVisible();
    await adminDashboardPage.clickSignInLink();
    await adminDashboardPage.waitForLoadState();
    await loginPage.completeLoginForm(USER_EMAIL!, USER_PASSWORD!);
    await adminDashboardPage.waitForLoadState();
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectNotFoundHeading();
  });

  test("[@Regression] OSDEV-2195-2: Verify admin user can access moderation queue", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    
    const loginPage = new LoginPage(page, BASE_URL!);
    const adminDashboardPage = new AdminDashboardPage(page, BASE_URL!);
    
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectSignInLinkVisible();
    await adminDashboardPage.clickSignInLink();
    await adminDashboardPage.waitForLoadState();
    await loginPage.completeLoginForm(USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    await adminDashboardPage.waitForLoadState();
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectModerationQueueHeading();
    
    const headingText = await adminDashboardPage.getPageHeading();
    expect(headingText).toContain("Moderation Queue");
  });

  test("[@Regression] OSDEV-2195-3: Verify admin can directly access moderation queue via main page login", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    
    const loginPage = new LoginPage(page, BASE_URL!);
    const adminDashboardPage = new AdminDashboardPage(page, BASE_URL!);
    
    await loginPage.loginToMainPage(USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectModerationQueuePage();
    
    const headingText = await adminDashboardPage.getPageHeading();
    expect(headingText).toContain("Moderation Queue");
  });

  test("[@Regression] OSDEV-2195-4: Verify regular user sees 'Not found' when accessing via main page login", async ({ page }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    
    const loginPage = new LoginPage(page, BASE_URL!);
    const adminDashboardPage = new AdminDashboardPage(page, BASE_URL!);
    
    await loginPage.loginToMainPage(USER_EMAIL!, USER_PASSWORD!);
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectNotFoundHeading();
    
    const url = await adminDashboardPage.getCurrentUrl();
    expect(url).toContain("/dashboard/moderation-queue");
  });
});


