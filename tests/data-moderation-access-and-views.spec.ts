import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import {
  acceptCookiesIfPresent,
  loginViaAuthPage,
  logoutViaMyAccount,
} from "./utils/dashboard";
import { DashboardPage } from "./pages/DashboardPage";
import { FacilityClaimsPage } from "./pages/FacilityClaimsPage";
import { ContributorListsPage } from "./pages/ContributorListsPage";
import { DeleteFacilityPage } from "./pages/DeleteFacilityPage";
import { ApiBlocksPage } from "./pages/ApiBlocksPage";
import {
  GeocoderPage,
  OSDEV_1303_EXPECTED,
} from "./pages/GeocoderPage";
import {
  fetchProductionLocations,
  fetchFacilityByOsId,
} from "./utils/dashboardApi";

test.beforeAll(setup);

test.describe("[@regression] OSDEV-3210 Dashboard access control", () => {
  test("[@regression] OSDEV-3210: superuser sees dashboard; non-superuser Not found; unauth sign-in", async ({
    page,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    const {
      BASE_URL,
      USER_ADMIN_EMAIL,
      USER_ADMIN_PASSWORD,
      USER_EMAIL,
      USER_PASSWORD,
    } = process.env;
    const dashboard = new DashboardPage(page, BASE_URL!);

    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    await dashboard.goToDashboard();
    await dashboard.expectModeratorDashboard();

    await logoutViaMyAccount(page);
    await loginViaAuthPage(page, USER_EMAIL!, USER_PASSWORD!);
    await dashboard.goToDashboard();
    await dashboard.expectNotFound();

    await page.goto(`${BASE_URL}/dashboard/claims`);
    await acceptCookiesIfPresent(page);
    await dashboard.expectNotFound();

    await logoutViaMyAccount(page);
    await page.context().clearCookies();
    await dashboard.goToDashboard();
    await dashboard.expectSignInNotice();
  });
});

test.describe("[@regression] OSDEV-1282 Contributor Lists view", () => {
  test("[@regression] OSDEV-1282: View Contributor Lists in Dashboard", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const dashboard = new DashboardPage(page, BASE_URL!);
    await dashboard.goToDashboard();
    await dashboard.openModeratorLink("View Contributor Lists");

    const listsPage = new ContributorListsPage(page, BASE_URL!);
    await listsPage.expectListsPage();
    await listsPage.expectTableColumns();
    await listsPage.expectRowsPresent();
  });
});

test.describe("[@regression] OSDEV-1287 Facility Claims view", () => {
  test("[@regression] OSDEV-1287: View Facility Claims", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const dashboard = new DashboardPage(page, BASE_URL!);
    await dashboard.goToDashboard();
    await dashboard.openModeratorLink("View Facility Claims");

    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.expectClaimsPage();
    expect(page.url()).toContain("statuses=PENDING");
    await claimsPage.expectTableColumns();
    await claimsPage.expectRowsPresent();
  });
});

test.describe("[@regression] OSDEV-1300 API Blocks view", () => {
  test("[@regression] OSDEV-1300: View API Blocks from Dashboard", async ({
    page,
  }) => {
    // Known bug: https://opensupplyhub.atlassian.net/browse/OSDEV-961
    // API Blocks page stays empty / api/api-blocks/ times out.
    test.fail(
      true,
      "Blocked by OSDEV-961: API Blocks page empty / api/api-blocks/ request timeout",
    );

    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const dashboard = new DashboardPage(page, BASE_URL!);
    await dashboard.goToDashboard();
    await dashboard.openModeratorLink("View API Blocks");

    const apiBlocks = new ApiBlocksPage(page, BASE_URL!);
    await apiBlocks.expectBlocksDataLoaded();
  });
});

test.describe("[@regression] OSDEV-1303 Geocoder", () => {
  test("[@regression] OSDEV-1303: Geocode facility address on Dashboard Geocode page", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    // Manual steps: Dashboard → Geocode → /dashboard/geocoder
    const dashboard = new DashboardPage(page, BASE_URL!);
    await dashboard.goToDashboard();
    await dashboard.openModeratorLink("Geocode");

    const geocoder = new GeocoderPage(page, BASE_URL!);
    await geocoder.expectPage();
    await geocoder.selectCountry(OSDEV_1303_EXPECTED.country);
    await geocoder.fillAddress(OSDEV_1303_EXPECTED.address);
    await geocoder.geocode();
    // Expected response from OSDEV-1303 description
    await geocoder.expectGeocodeResult(OSDEV_1303_EXPECTED);
  });
});

test.describe("[@regression] OSDEV-3207 Cancel delete (read-safe path)", () => {
  test("[@regression] OSDEV-3207: Cancel delete from confirmation dialog", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const locations = await fetchProductionLocations(page, "IS", 2);
    test.skip(locations.length < 1, "No Iceland production locations available");
    const osId = locations[0].os_id;

    const deletePage = new DeleteFacilityPage(page, BASE_URL!);
    await deletePage.goToDeleteFacility();
    await deletePage.expectPage();
    await deletePage.searchOsId(osId);
    await deletePage.clickDeleteFacility();
    await expect(page.getByRole("button", { name: /^cancel$/i })).toBeVisible();
    await deletePage.cancelDelete();

    const facilityResponse = await fetchFacilityByOsId(page, osId);
    expect(facilityResponse.status()).toBe(200);
  });
});
