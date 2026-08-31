import { test, expect, Page } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { MainPage } from "./pages/MainPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ContributePage } from "./pages/ContributePage";
import { ClaimedFacilitiesPage } from "./pages/ClaimedFacilitiesPage";
import { MyListsPage } from "./pages/MyListsPage";
import { LocationPage } from "./pages/LocationPage";
import { FacilitiesApi } from "./utils/api";
import { FILTERED_FACILITIES_PATH } from "./utils/downloadLimits";
import {
  dismissListSubmittedDialog,
  uploadFacilityList,
  waitForListToAppear,
} from "./utils/facilityLists";

test.beforeAll(setup);

function pages(page: Page) {
  const { BASE_URL } = process.env;
  return {
    loginPage: new LoginPage(page, BASE_URL!),
    mainPage: new MainPage(page, BASE_URL!),
    settingsPage: new SettingsPage(page, BASE_URL!),
    contributePage: new ContributePage(page, BASE_URL!),
    claimedPage: new ClaimedFacilitiesPage(page, BASE_URL!),
    listsPage: new MyListsPage(page, BASE_URL!),
    locationPage: new LocationPage(page, BASE_URL!),
  };
}

async function loginAs(
  page: Page,
  email: string,
  password: string,
) {
  const { loginPage } = pages(page);
  await loginPage.loginViaAuthPage(email, password);
  return loginPage;
}

async function loginWebsiteUser(page: Page) {
  return loginAs(page, process.env.USER_EMAIL!, process.env.USER_PASSWORD!);
}

async function loginApiUser(page: Page) {
  return loginAs(page, process.env.USER_API_EMAIL!, process.env.USER_API_PASSWORD!);
}

test.describe("[@regression] Website users", () => {
  test("[@regression] OSDEV-1265: API user sees Token Limit info on the Settings API tab", async ({
    page,
  }) => {
    const { USER_API_EMAIL } = process.env;
    const { mainPage, settingsPage } = pages(page);

    await loginApiUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();

    const { loginPage } = pages(page);
    await loginPage.openSettings();
    await settingsPage.expectProfileForm(USER_API_EMAIL!);
    await settingsPage.expectApiTabVisible();
    await settingsPage.openApiTab();
    await settingsPage.expectTokenLimitInfo();
  });

  test("[@regression] OSDEV-3311: regular user does not see the Settings API / Token Limit tab", async ({
    page,
  }) => {
    const { USER_EMAIL } = process.env;
    const { mainPage, settingsPage, loginPage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.openSettings();
    await settingsPage.expectProfileForm(USER_EMAIL!);
    await settingsPage.expectApiTabHidden();
  });

  test("[@regression] OSDEV-3303: user with no lists sees empty My Lists state and the contribute link", async ({
    page,
  }) => {
    const { mainPage, loginPage, listsPage, contributePage } = pages(page);

    await loginApiUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.openMyLists();
    await listsPage.expectEmptyState();
    await listsPage.openContributeFromEmptyState();
    await contributePage.expectContributeHome();
  });

  test("[@regression] OSDEV-3301: My Account from /map shows My Facilities, My Lists, Settings, and Log Out without Dashboard", async ({
    page,
  }) => {
    const { mainPage, loginPage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectWebsiteAccountMenu();
  });

  test("[@regression] OSDEV-3305: website user can change cookie preferences on the Settings Profile tab", async ({
    page,
  }) => {
    const { mainPage, loginPage, settingsPage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.openSettings();
    await settingsPage.expectCookiePreferences();
    await settingsPage.rejectCookiePreferences();
    await settingsPage.expectCookieAcceptVisible();
    await settingsPage.acceptCookiePreferences();
    await settingsPage.expectCookiePreferences();
  });

  test("[@regression] OSDEV-3304: website user can view My Claimed Facilities and edit claim details", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    const { mainPage, loginPage, claimedPage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.openMyFacilities();
    await claimedPage.expectClaimedList();
    await claimedPage.openFirstClaim();

    const originalDescription = await claimedPage.getDescription();
    const updatedDescription = `E2E claim details ${Date.now()}`;
    try {
      await claimedPage.fillDescription(updatedDescription);
      await claimedPage.saveClaimDetails();
      await expect(page.getByRole("heading", { name: "Claimed Facility Details" })).toBeVisible();
    } finally {
      await claimedPage.fillDescription(originalDescription);
      await claimedPage.saveClaimDetails();
    }
  });

  test("[@regression] OSDEV-3308: website user can open Add a Single Location", async ({
    page,
  }) => {
    const { mainPage, contributePage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await mainPage.openAddData();
    await contributePage.expectContributeHome();
    await contributePage.expectSingleLocationAccess();
    await contributePage.openSingleLocation();
  });

  test("[@regression] OSDEV-3307: website user can open Upload Multiple Locations", async ({
    page,
  }) => {
    const { mainPage, contributePage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await mainPage.openAddData();
    await contributePage.expectContributeHome();
    await contributePage.expectUploadMultipleAccess();
    await contributePage.openUploadMultipleLocations();
  });

  test("[@regression] OSDEV-3310: signed-in user can submit Report Closure / Move and Report Reopened", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    test.setTimeout(180000);
    const { mainPage, locationPage } = pages(page);
    const facilitiesApi = new FacilitiesApi(page);
    const openOsId = (await facilitiesApi.unclaimedOpen()).id;
    const closedOsId = await facilitiesApi.closedOsId();
    const reason = `QA website user status report ${Date.now()}`;

    await loginWebsiteUser(page);
    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();

    await locationPage.goToOsId(openOsId);
    await locationPage.expectReportStatusLabel("Report Closure / Move");
    await locationPage.chooseReportStatus();
    await locationPage.expectSignedInReportDialog("closed");
    await locationPage.submitSignedInStatusReport(reason);

    await locationPage.goToOsId(closedOsId);
    await locationPage.expectReportStatusLabel("Report Reopened");
    await locationPage.chooseReportStatus();
    await locationPage.expectSignedInReportDialog("reopened");
    await locationPage.submitSignedInStatusReport(`${reason} reopen`);
  });

  test("[@regression] OSDEV-1262: website user can download facilities from search", async ({
    page,
  }) => {
    test.setTimeout(120000);
    const { mainPage } = pages(page);

    await loginWebsiteUser(page);
    await mainPage.goToFacilitiesSearch(FILTERED_FACILITIES_PATH);

    const downloadResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/facilities-downloads/") &&
        resp.request().method() === "GET" &&
        resp.status() < 400,
      { timeout: 90000 },
    );
    await mainPage.downloadFacilities("CSV");
    const response = await downloadResponse;
    const body = await response.json();
    expect(body).toHaveProperty("count");
    expect(body.count).toBeGreaterThan(0);
  });

  test("[@regression] OSDEV-1262: website user can download submitted and formatted files from a list", async ({
    page,
  }) => {
    test.setTimeout(25 * 60 * 1000);
    const { listsPage } = pages(page);

    await loginWebsiteUser(page);
    const uploaded = await uploadFacilityList(page, {
      listName: "DO NOT APPROVE website user list",
      description: "OSDEV-1262 website user list download",
    });
    await waitForListToAppear(page, uploaded.listId);
    await dismissListSubmittedDialog(page);

    await listsPage.goToMyLists();
    await listsPage.expectMyLists();
    await listsPage.expectListVisible(uploaded.listName);
    await listsPage.openListByName(uploaded.listName);
    await listsPage.expectListDetailDownloads();

    const submitted = await listsPage.downloadSubmittedFile();
    expect(submitted.suggestedFilename()).toBeTruthy();
    const formatted = await listsPage.downloadFormattedFile();
    expect(formatted.suggestedFilename()).toBeTruthy();
  });
});
