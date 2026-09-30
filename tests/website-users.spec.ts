import { test, expect, Page } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { MainPage } from "./pages/MainPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ContributePage } from "./pages/ContributePage";
import { ContributeListPage } from "./pages/ContributeListPage";
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

type WebsiteUserKind = "website" | "api";

function pages(page: Page) {
  const { BASE_URL } = process.env;
  return {
    loginPage: new LoginPage(page, BASE_URL!),
    mainPage: new MainPage(page, BASE_URL!),
    settingsPage: new SettingsPage(page, BASE_URL!),
    contributePage: new ContributePage(page, BASE_URL!),
    listPage: new ContributeListPage(page, BASE_URL!),
    claimedPage: new ClaimedFacilitiesPage(page, BASE_URL!),
    listsPage: new MyListsPage(page, BASE_URL!),
    locationPage: new LocationPage(page, BASE_URL!),
  };
}

function credentials(kind: WebsiteUserKind) {
  if (kind === "api") {
    return {
      email: process.env.USER_API_EMAIL!,
      password: process.env.USER_API_PASSWORD!,
    };
  }
  return {
    email: process.env.USER_EMAIL!,
    password: process.env.USER_PASSWORD!,
  };
}

async function signIn(page: Page, kind: WebsiteUserKind = "website") {
  const p = pages(page);
  const { email, password } = credentials(kind);
  await p.loginPage.loginViaAuthPage(email, password);
  return p;
}

async function signInOnMap(page: Page, kind: WebsiteUserKind = "website") {
  const p = await signIn(page, kind);
  await p.mainPage.goTo();
  await p.mainPage.acceptCookiesIfPresent();
  return p;
}

async function openContributeHome(page: Page) {
  const p = await signInOnMap(page);
  await p.mainPage.openAddData();
  await p.contributePage.expectContributeHome();
  return p;
}

test.describe("[@regression] Website users", () => {
  test("[@regression] OSDEV-1265: API user sees Token Limit info on the Settings API tab", async ({
    page,
  }) => {
    const { USER_API_EMAIL } = process.env;
    const { loginPage, settingsPage } = await signInOnMap(page, "api");

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
    const { loginPage, settingsPage } = await signInOnMap(page);

    await loginPage.openSettings();
    await settingsPage.expectProfileForm(USER_EMAIL!);
    await settingsPage.expectApiTabHidden();
  });

  test("[@regression] OSDEV-3303: user with no lists sees empty My Lists state and the contribute link", async ({
    page,
  }) => {
    const { loginPage, listsPage, contributePage } = await signInOnMap(page, "api");

    await loginPage.openMyLists();
    await listsPage.expectEmptyState();
    await listsPage.openContributeFromEmptyState();
    await contributePage.expectContributeHome();
  });

  test("[@regression] OSDEV-3301: My Account from /map shows My Facilities, My Lists, Settings, and Log Out without Dashboard", async ({
    page,
  }) => {
    const { loginPage } = await signInOnMap(page);
    await loginPage.expectWebsiteAccountMenu();
  });

  test("[@regression] OSDEV-3305: website user can change cookie preferences on the Settings Profile tab", async ({
    page,
  }) => {
    const { loginPage, settingsPage } = await signInOnMap(page);

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
    const { loginPage, claimedPage } = await signInOnMap(page);

    await loginPage.openMyFacilities();
    await claimedPage.expectClaimedList();
    await claimedPage.openFirstClaim();

    const originalDescription = await claimedPage.getDescription();
    const updatedDescription = `E2E claim details ${Date.now()}`;
    try {
      await claimedPage.fillDescription(updatedDescription);
      await claimedPage.saveClaimDetails();
    } finally {
      await claimedPage.fillDescription(originalDescription);
      await claimedPage.saveClaimDetails();
    }
  });

  test("[@regression] OSDEV-3308: website user can open Add a Single Location", async ({
    page,
  }) => {
    const { contributePage } = await openContributeHome(page);
    await contributePage.expectSingleLocationAccess();
    await contributePage.openSingleLocation();
  });

  test("[@regression] OSDEV-3307: website user can open Upload Multiple Locations", async ({
    page,
  }) => {
    const { contributePage, listPage } = await openContributeHome(page);
    await contributePage.expectUploadMultipleAccess();
    await contributePage.expectSingleLocationAccess();
    await contributePage.openUploadMultipleLocations();
    await listPage.expectUploadForm();
  });

  test("[@regression] OSDEV-3310: signed-in user can submit Report Closure / Move and Report Reopened", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    test.setTimeout(180000);
    const { locationPage } = await signInOnMap(page);
    const facilitiesApi = new FacilitiesApi(page);
    const openOsId = (await facilitiesApi.unclaimedOpen()).id;
    const closedOsId = await facilitiesApi.closedOsId();
    const reason = `QA website user status report ${Date.now()}`;

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
    const { mainPage } = await signIn(page);

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
    const { listsPage, listPage, loginPage } = await signIn(page);

    await listPage.goToUploadForm();
    await loginPage.expectSignedIn();
    await listPage.expectUploadForm();
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
