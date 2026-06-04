/**
 * E2E coverage for Data Download Limits (QAlity folder: Data Download and Limits).
 * Epic: OSDEV-2192 — https://opensupplyhub.atlassian.net/browse/OSDEV-2192
 */
import { test, expect, Page } from "@playwright/test";
import { setup } from "./utils/env";
import { MainPage } from "./pages/MainPage";
import { LoginPage } from "./pages/LoginPage";
import { EmbeddedMapPage } from "./pages/EmbeddedMapPage";
import {
  resetUserFreeDownloadQuota,
  setUserFreeDownloadQuota,
} from "./utils/downloadLimits";
import { setPrivateInstanceMode, resetPrivateInstanceMode } from "./utils/waffleSwitches";

test.beforeAll(setup);

/** Always turn private_instance off when this spec file finishes (pass or fail). */
test.afterAll(async () => {
  await resetPrivateInstanceMode();
});
test.describe.configure({ mode: "serial" });

function createPages(page: Page) {
  const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
  return {
    mainPage: new MainPage(page, BASE_URL!),
    loginPage: new LoginPage(page, BASE_URL!),
    userEmail: USER_EMAIL!,
    userPassword: USER_PASSWORD!,
  };
}

async function loginAndOpenFilteredSearch(page: Page) {
  const { mainPage, loginPage, userEmail, userPassword } = createPages(page);
  await loginPage.loginViaAuthPage(userEmail, userPassword);
  await mainPage.goToFilteredFacilitiesSearch();
  return mainPage;
}

async function openEmbeddedMap(page: Page) {
  const { BASE_URL } = process.env;
  const embeddedMap = new EmbeddedMapPage(page, BASE_URL!);
  await embeddedMap.openFixture();
  return embeddedMap;
}

async function loginAndOpenEmbeddedMap(page: Page) {
  const { loginPage, userEmail, userPassword } = createPages(page);
  await loginPage.loginViaAuthPage(userEmail, userPassword);
  return openEmbeddedMap(page);
}

async function openFilteredSearchInPrivateInstance(page: Page) {
  const { mainPage } = createPages(page);
  await mainPage.goToFilteredFacilitiesSearchWithReload();
  return mainPage;
}

async function loginAndOpenFilteredSearchInPrivateInstance(page: Page) {
  const { mainPage, loginPage, userEmail, userPassword } = createPages(page);
  await loginPage.loginViaAuthPage(userEmail, userPassword);
  await mainPage.goToFilteredFacilitiesSearchWithReload();
  return mainPage;
}

test.describe("[@Regression] Data download quotas and UI", () => {
  test.beforeAll(async () => {
    await resetPrivateInstanceMode();
  });

  test.afterAll(async () => {
    await resetUserFreeDownloadQuota();
    await resetPrivateInstanceMode();
  });

  test.describe("Anonymous & authentication", () => {
    test("[@Regression] OSDEV-2069: anonymous user sees login tooltip on Download hover", async ({
      page,
    }) => {
      const { mainPage } = createPages(page);
      await mainPage.goToFilteredFacilitiesSearch();
      await mainPage.hoverDownloadButton();
      await mainPage.expectAnonymousDownloadTooltip();
    });

    test("[@Regression] OSDEV-2069: anonymous user is prompted to log in when selecting Excel download", async ({
      page,
    }) => {
      const { mainPage } = createPages(page);
      await mainPage.goToFilteredFacilitiesSearch();
      await mainPage.downloadFacilities("Excel");
      await mainPage.expectDownloadLoginPrompt();
    });
  });

  test.describe("Lead-in copy (DownloadLimitInfo)", () => {
    test.beforeEach(async () => {
      await resetUserFreeDownloadQuota();
    });

    test("[@Regression] OSDEV-2080: lead-in is hidden when results are within annual quota", async ({
      page,
    }) => {
      const mainPage = await loginAndOpenFilteredSearch(page);
      const resultCount = await mainPage.getResultsCount();
      expect(resultCount).toBeGreaterThan(0);
      expect(resultCount).toBeLessThanOrEqual(5000);

      await mainPage.expectDownloadLeadInHidden();
      await mainPage.expectPurchaseButtonHidden();
    });

    test("[@Regression] OSDEV-2105: lead-in is visible when filtered results exceed remaining quota", async ({
      page,
    }) => {
      await setUserFreeDownloadQuota("100");
      const mainPage = await loginAndOpenFilteredSearch(page);

      await mainPage.expectDownloadLeadInVisible();
      await mainPage.expectLeadInMentionsAnnualFreeLimit();
    });

    test("[@Regression] OSDEV-2682: lead-in is hidden on unfiltered search", async ({ page }) => {
      await setUserFreeDownloadQuota("100");
      const { mainPage, loginPage, userEmail, userPassword } = createPages(page);
      await loginPage.loginViaAuthPage(userEmail, userPassword);
      await mainPage.goToUnfilteredFacilitiesSearch();

      await mainPage.expectDownloadLeadInHidden();
    });

    test("[@Regression] lead-in is hidden for anonymous users", async ({ page }) => {
      const { mainPage } = createPages(page);
      await mainPage.goToFilteredFacilitiesSearch();
      await mainPage.expectDownloadLeadInHidden();
    });
  });

  test.describe("Download button states & tooltips", () => {
    test.beforeEach(async () => {
      await resetUserFreeDownloadQuota();
    });

    test("[@Regression] OSDEV-2110: logged-in user within quota sees Download menu with CSV and Excel", async ({
      page,
    }) => {
      const mainPage = await loginAndOpenFilteredSearch(page);
      await mainPage.expectDownloadButtonVisible();
      await mainPage.expectPurchaseButtonHidden();
      await mainPage.expectDownloadMenuOptions();
    });

    test("[@Regression] OSDEV-2104: over-quota user sees Purchase More Downloads with mismatch tooltip", async ({
      page,
    }) => {
      await setUserFreeDownloadQuota("100");
      const mainPage = await loginAndOpenFilteredSearch(page);

      await mainPage.expectPurchaseButtonVisible();
      await mainPage.hoverPurchaseButton();
      await mainPage.expectOverQuotaPurchaseTooltip(100);
    });

    test("[@Regression] OSDEV-2104: exhausted quota user sees annual limit reached tooltip", async ({
      page,
    }) => {
      await setUserFreeDownloadQuota("0");
      const mainPage = await loginAndOpenFilteredSearch(page);

      await mainPage.expectPurchaseButtonVisible();
      await mainPage.hoverPurchaseButton();
      await mainPage.expectExhaustedQuotaTooltip();
    });
  });

  test.describe("Purchase CTA", () => {
    test.beforeEach(async () => {
      await setUserFreeDownloadQuota("100");
    });

    test("[@Regression] OSDEV-2081: Purchase More Downloads triggers checkout session request", async ({
      page,
    }) => {
      const mainPage = await loginAndOpenFilteredSearch(page);

      const checkoutRequest = page.waitForRequest(
        (req) =>
          req.method() === "POST" &&
          (req.url().includes("checkout") ||
            req.url().includes("stripe") ||
            req.url().includes("session")),
        { timeout: 30000 }
      );

      await mainPage.clickPurchaseMoreDownloads();
      const request = await checkoutRequest;
      expect(request.url()).toBeTruthy();
    });
  });

  test.describe("Download actions", () => {
    test.beforeEach(async () => {
      await resetUserFreeDownloadQuota();
    });

    test("[@Regression] OSDEV-2070: logged-in user within quota triggers facilities-downloads API on CSV", async ({
      page,
    }) => {
      test.setTimeout(120000);

      const mainPage = await loginAndOpenFilteredSearch(page);

      const downloadResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/facilities-downloads/") &&
          resp.request().method() === "GET" &&
          resp.status() < 400,
        { timeout: 90000 }
      );

      await mainPage.downloadFacilities("CSV");
      const response = await downloadResponse;
      const body = await response.json();
      expect(body).toHaveProperty("count");
      expect(body.count).toBeGreaterThan(0);
    });
  });
});

test.describe("[@Regression] Embedded map download limits (testEM-upto10000)", () => {
  test.describe("10k per-search cap (no annual quota UI)", () => {
    test("[@Regression] embedded map: anonymous user sees 10k download cap tooltip on Download hover", async ({
      page,
    }) => {
      const embeddedMap = await openEmbeddedMap(page);
      await embeddedMap.expectResultsWithinEmbedCap();
      await embeddedMap.expectAnnualQuotaUiHidden();
      await embeddedMap.hoverDownloadButton();
      await embeddedMap.expectEmbedResultsLimitTooltip();
    });

    test("[@Regression] embedded map: anonymous user can open Download menu with CSV and Excel", async ({
      page,
    }) => {
      const embeddedMap = await openEmbeddedMap(page);
      await embeddedMap.expectResultsWithinEmbedCap();
      await embeddedMap.expectAnnualQuotaUiHidden();
      await embeddedMap.expectDownloadMenuOptions();
    });

    test("[@Regression] embedded map: logged-in user within 10k cap sees Download menu with CSV and Excel", async ({
      page,
    }) => {
      const embeddedMap = await loginAndOpenEmbeddedMap(page);
      await embeddedMap.expectResultsWithinEmbedCap();
      await embeddedMap.expectAnnualQuotaUiHidden();
      await embeddedMap.expectDownloadButtonVisible();
      await embeddedMap.expectDownloadMenuOptions();
    });
  });
});

test.describe("[@Regression] Private instance mode (10k cap, no annual quota UI)", () => {
  test.beforeAll(async () => {
    await setPrivateInstanceMode(true);
  });

  test.afterAll(async () => {
    await resetPrivateInstanceMode();
  });

  test.describe("Main site facilities search", () => {
    test("[@Regression] private instance: anonymous user sees 10k download cap tooltip on Download hover", async ({
      page,
    }) => {
      const mainPage = await openFilteredSearchInPrivateInstance(page);
      await mainPage.expectResultsWithinPerSearchCap();
      await mainPage.expectAnnualQuotaUiHidden();
      await mainPage.hoverDownloadButton();
      await mainPage.expectPerSearchDownloadLimitTooltip();
    });

    test("[@Regression] private instance: anonymous user can open Download menu with CSV and Excel", async ({
      page,
    }) => {
      const mainPage = await openFilteredSearchInPrivateInstance(page);
      await mainPage.expectResultsWithinPerSearchCap();
      await mainPage.expectAnnualQuotaUiHidden();
      await mainPage.expectDownloadMenuOptions();
    });

    test("[@Regression] private instance: logged-in user within 10k cap sees Download menu with CSV and Excel", async ({
      page,
    }) => {
      const mainPage = await loginAndOpenFilteredSearchInPrivateInstance(page);
      await mainPage.expectResultsWithinPerSearchCap();
      await mainPage.expectAnnualQuotaUiHidden();
      await mainPage.expectDownloadButtonVisible();
      await mainPage.expectDownloadMenuOptions();
    });
  });
});
