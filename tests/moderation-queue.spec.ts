import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ModerationQueuePage, MODERATION_QUEUE_COLUMNS } from "./pages/ModerationQueuePage";
import { SingleLocationContributionPage } from "./pages/SingleLocationContributionPage";
import {
  loginAdminToModerationQueue,
  uniqueSlcLocationName,
} from "./utils/moderationQueue";
import {
  patchModerationEventStatus,
  postModerationProductionLocation,
  patchModerationProductionLocation,
} from "./utils/moderationApi";

test.beforeAll(setup);

test.describe("[@regression] OSDEV-2195 Moderation Queue - Authentication and Access", () => {
  test("[@regression] OSDEV-2195-1: Verify regular user sees 'Not found' after authentication", async ({ page }) => {
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

  test("[@regression] OSDEV-2195-2: Verify admin user can access moderation queue", async ({ page }) => {
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

  test("[@regression] OSDEV-2195-3: Verify admin can directly access moderation queue via main page login", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    
    const loginPage = new LoginPage(page, BASE_URL!);
    const adminDashboardPage = new AdminDashboardPage(page, BASE_URL!);
    
    await loginPage.loginToMainPage(USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    await adminDashboardPage.goToModerationQueue();
    await adminDashboardPage.expectModerationQueuePage();
    
    const headingText = await adminDashboardPage.getPageHeading();
    expect(headingText).toContain("Moderation Queue");
  });

  test("[@regression] OSDEV-2195-4: Verify regular user sees 'Not found' when accessing via main page login", async ({ page }) => {
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

test.describe("[@regression] OSDEV-2283 Moderation Queue regression tests", () => {
  test("[@regression] OSDEV-1483: Check default settings on filters, sorting, and pagination", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.expectDefaultSettings();
  });

  test("[@regression] OSDEV-1484: Check filtering by Data Source", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.chooseFilterOption("Data Source", "API");
    await moderationQueuePage.waitForModerationEventsResponse();

    const sourceValues = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.SOURCE,
    );
    expect(sourceValues.length).toBeGreaterThan(0);
    expect(sourceValues.every((value) => value === "API")).toBe(true);
    expect(sourceValues).not.toContain("SLC");
  });

  test("[@regression] OSDEV-1485: Check filtering by Moderation Status", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.chooseFilterOption("Moderation Status", "APPROVED");
    await moderationQueuePage.waitForModerationEventsResponse();

    const statusValues = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.STATUS,
    );
    expect(statusValues.length).toBeGreaterThan(0);
    expect(statusValues.every((value) => value === "APPROVED")).toBe(true);
    expect(statusValues).not.toContain("REJECTED");
    expect(statusValues).not.toContain("PENDING");
  });

  test("[@regression] OSDEV-1486: Check filtering by Country Name", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.chooseFilterOption("Country Name", "Türkiye");
    await moderationQueuePage.waitForModerationEventsResponse();

    const countryValues = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.COUNTRY,
    );
    expect(countryValues.length).toBeGreaterThan(0);
    expect(countryValues.every((value) => value === "Türkiye")).toBe(true);
  });

  test("[@regression] OSDEV-1487: Check filtering by date range", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.setDateRange("2020-01-01", "2030-12-31");

    const dateValues = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.CREATED_DATE,
    );
    expect(dateValues.length).toBeGreaterThan(0);
    expect(dateValues.length).toBeLessThanOrEqual(25);
  });

  test("[@regression] OSDEV-1488: Check sorting by available data in the table", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();

    const sortableColumns = [
      "Created Date",
      "Location Name",
      "Country",
      "Contributor",
      "Source Type",
      "Moderation Status",
      "Moderation Decision Date",
      "Last Updated",
    ];

    for (const column of sortableColumns) {
      await moderationQueuePage.sortByColumn(column);
      const values = await moderationQueuePage.getColumnValues(
        MODERATION_QUEUE_COLUMNS.CREATED_DATE,
      );
      expect(values.length).toBeGreaterThan(0);
    }
  });

  test("[@regression] OSDEV-1489: Check pagination 25/50/100 with and without filters", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.setPageSize(50);
    await moderationQueuePage.expectRowCountBetween(25, 50);

    await moderationQueuePage.setPageSize(100);
    await moderationQueuePage.expectRowCountBetween(50, 100);

    await moderationQueuePage.setPageSize(25);
    await moderationQueuePage.expectRowCount(25);

    await moderationQueuePage.chooseFilterOption("Moderation Status", "APPROVED");
    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.setPageSize(50);
    await moderationQueuePage.expectRowCountBetween(1, 50);

    const statusValues = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.STATUS,
    );
    expect(statusValues.every((value) => value === "APPROVED")).toBe(true);
  });

  test("[@regression] OSDEV-1490: Check download Excel with and without filters", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );
    const downloadDir = path.resolve(__dirname, "downloads");
    fs.mkdirSync(downloadDir, { recursive: true });

    await moderationQueuePage.waitForModerationEventsResponse();

    const unfilteredDownload = await moderationQueuePage.downloadExcel();
    const unfilteredPath = path.join(
      downloadDir,
      unfilteredDownload.suggestedFilename(),
    );
    await unfilteredDownload.saveAs(unfilteredPath);
    expect(fs.existsSync(unfilteredPath)).toBe(true);
    expect(path.basename(unfilteredPath)).toBe("moderation_events.xlsx");

    await moderationQueuePage.chooseFilterOption("Moderation Status", "APPROVED");
    await moderationQueuePage.waitForModerationEventsResponse();

    const filteredDownload = await moderationQueuePage.downloadExcel();
    const filteredPath = path.join(
      downloadDir,
      `filtered-${filteredDownload.suggestedFilename()}`,
    );
    await filteredDownload.saveAs(filteredPath);
    expect(fs.existsSync(filteredPath)).toBe(true);
    expect(path.basename(filteredPath)).toBe("filtered-moderation_events.xlsx");
  });

  test("[@regression] OSDEV-1522: Countries in filter are sorted by name, not alpha-2 code", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    const countryOptions = await moderationQueuePage.getCountryFilterOptions();
    expect(countryOptions.length).toBeGreaterThan(1);

    const sortedByName = [...countryOptions].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    expect(countryOptions).toEqual(sortedByName);
  });

  test("[@regression] OSDEV-1603: Navigation from moderation queue opens Contribution Record", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    const contributionRecordPage =
      await moderationQueuePage.openFirstContributionRecord();
    await contributionRecordPage.waitForLoadState("load");

    expect(contributionRecordPage.url()).toContain("/dashboard/moderation-queue/");
    await expect(
      contributionRecordPage.getByRole("heading", {
        name: "Dashboard / Moderation Queue / Contribution Record",
      }),
    ).toBeVisible();
  });
});

test.describe.serial("[@regression] OSDEV-2283 Moderation Queue API and SLC workflow", () => {
  test.setTimeout(4 * 60 * 1000);

  let moderationId = "";
  let locationName = "";
  let osId = "";
  let approvedLocationName = "";
  const approvedLocationAddress =
    "5678 Automation Approval Street, Test District, Test City, 12345";

  test("[@regression] OSDEV-1561 setup: Create SLC request with regular user", async ({
    page,
  }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const slcPage = new SingleLocationContributionPage(page, BASE_URL!);

    locationName = uniqueSlcLocationName("OSDEV-2283 SLC");
    await slcPage.goToNameAddressTab();
    await slcPage.ensureLoggedInAsRegularUser(USER_EMAIL!, USER_PASSWORD!);
    moderationId = await slcPage.submitNewLocation({
      name: locationName,
      address: "1234 Automation Test Street, Test District, Yiwu, Zhejiang, 322002",
      country: "China",
    });
  });

  test("[@regression] OSDEV-1559: Moderation Decision Date is N/A when status_change_date is absent", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const moderationQueuePage = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await moderationQueuePage.waitForModerationEventsResponse();
    await moderationQueuePage.chooseFilterOption("Moderation Status", "PENDING");
    await moderationQueuePage.waitForModerationEventsResponse();

    const decisionDates = await moderationQueuePage.getColumnValues(
      MODERATION_QUEUE_COLUMNS.DECISION_DATE,
    );
    expect(decisionDates.length).toBeGreaterThan(0);
    expect(decisionDates.some((value) => value === "N/A")).toBe(true);

    await moderationQueuePage.waitForLocationInQueue(locationName);

    const targetRow = moderationQueuePage.findRowByLocationName(locationName);
    await expect(targetRow).toBeVisible();
    const decisionDateCell = targetRow.locator(
      `td:nth-child(${MODERATION_QUEUE_COLUMNS.DECISION_DATE})`,
    );
    await expect(decisionDateCell).toHaveText("N/A");
  });

  test("[@regression] OSDEV-1560: PATCH moderation event updates Moderation Decision Date", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    const patchResponse = await patchModerationEventStatus(
      page.request,
      BASE_URL!,
      moderationId,
      "APPROVED",
    );
    expect(patchResponse.status()).toBe(200);

    const body = await patchResponse.json();
    expect(body.status).toBe("APPROVED");
    expect(body.status_change_date).toBeTruthy();

    const moderationQueuePage = new ModerationQueuePage(page, BASE_URL!);
    await moderationQueuePage.waitForDecisionDateUpdated(locationName, "APPROVED");
  });

  test("[@regression] OSDEV-1561: POST production-locations updates Moderation Decision Date", async ({
    page,
  }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } =
      process.env;

    const slcPage = new SingleLocationContributionPage(page, BASE_URL!);
    const createModerationId = uniqueSlcLocationName("OSDEV-1561");
    const createLocationName = `${createModerationId} Location`;

    await slcPage.goToNameAddressTab();
    await slcPage.ensureLoggedInAsRegularUser(USER_EMAIL!, USER_PASSWORD!);
    const newModerationId = await slcPage.submitNewLocation({
      name: createLocationName,
      address: approvedLocationAddress,
      country: "China",
    });
    approvedLocationName = createLocationName;

    await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    const postResponse = await postModerationProductionLocation(
      page.request,
      BASE_URL!,
      newModerationId,
    );
    expect(postResponse.status()).toBe(201);

    const postBody = await postResponse.json();
    osId = postBody.os_id;
    expect(osId).toBeTruthy();

    const moderationQueuePage = new ModerationQueuePage(page, BASE_URL!);
    await moderationQueuePage.waitForDecisionDateUpdated(
      createLocationName,
      "APPROVED",
    );
  });

  test("[@regression] OSDEV-1562: PATCH production-locations/{os_id} updates Moderation Decision Date", async ({
    page,
  }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } =
      process.env;

    expect(osId).toBeTruthy();

    const slcPage = new SingleLocationContributionPage(page, BASE_URL!);
    await slcPage.goToNameAddressTab();
    await slcPage.ensureLoggedInAsRegularUser(USER_EMAIL!, USER_PASSWORD!);
    try {
      await slcPage.searchAndOpenLocationForUpdate(osId);
    } catch {
      await slcPage.searchAndOpenExistingLocationByName(
        approvedLocationName,
        approvedLocationAddress,
        "China",
      );
    }

    const updatedName = `${locationName} Updated ${Date.now()}`;
    const updateModerationId = await slcPage.submitLocationUpdate(updatedName);

    await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    const patchResponse = await patchModerationProductionLocation(
      page.request,
      BASE_URL!,
      updateModerationId,
      osId,
    );
    expect(patchResponse.status()).toBe(200);

    const moderationQueuePage = new ModerationQueuePage(page, BASE_URL!);
    await moderationQueuePage.waitForDecisionDateUpdated(updatedName, "APPROVED");
  });
});
