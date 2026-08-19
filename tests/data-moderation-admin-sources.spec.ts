import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";

test.beforeAll(setup);

test.describe("[@regression] Admin Sources list ownership / active toggle", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test.setTimeout(3 * 60 * 1000);

  async function openListSource(page: import("@playwright/test").Page) {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const loginPage = new LoginPage(page, BASE_URL!);
    await loginPage.loginToAdminPanel(USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const admin = new AdminPage(page, BASE_URL!);
    await admin.goToSources(true);
    await admin.openFirstSource();
    return admin;
  }

  test("[@regression] OSDEV-1307: Activate a list via Admin Sources", async ({
    page,
  }) => {
    const admin = await openListSource(page);
    await admin.setSourceIsActive(true);
    await admin.saveChanges();
    await admin.goToSources(true);
    await admin.openFirstSource();
    await admin.expectSourceIsActive(true);
  });

  test("[@regression] OSDEV-1306: Deactivate a list via Admin Sources", async ({
    page,
  }) => {
    const admin = await openListSource(page);
    await admin.setSourceIsActive(false);
    await admin.saveChanges();
    // Re-open same source from URL if still on changelist
    const changeUrl = page.url();
    if (!changeUrl.includes("/change/")) {
      await admin.goToSources(true);
      await admin.openFirstSource();
    } else {
      await page.goto(changeUrl);
      await page.waitForLoadState();
    }
    // After save we land on list; open first again and verify inactive
    await admin.goToSources(true);
    await admin.openFirstSource();
    await admin.expectSourceIsActive(false);
  });

  test("[@regression] OSDEV-1304: Move an active list between contributors", async ({
    page,
  }) => {
    const admin = await openListSource(page);
    await admin.setSourceIsActive(true);
    await admin.changeSourceContributorBySearch("S&F");
    await admin.saveChanges();
    await expect(page.locator("#result_list")).toBeVisible({ timeout: 20000 });
  });

  test("[@regression] OSDEV-1305: Move an inactive list between contributors", async ({
    page,
  }) => {
    const admin = await openListSource(page);
    await admin.setSourceIsActive(false);
    await admin.saveChanges();
    await admin.goToSources(true);
    await admin.openFirstSource();
    await admin.changeSourceContributorBySearch("Open Supply");
    await admin.saveChanges();
    await expect(page.locator("#result_list")).toBeVisible({ timeout: 20000 });
  });
});
