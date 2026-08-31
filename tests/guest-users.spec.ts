import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";
import { MainPage } from "./pages/MainPage";
import { RegisterPage, uniqueSignupEmail, emailWithDifferentCasing } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LocationPage } from "./pages/LocationPage";
import { FacilitiesApi } from "./utils/api";

/** Filtered map search used to share results via Copy Link (OSDEV-3294). */
const GUEST_COPY_SEARCH_PATH =
  "/facilities?contributor_types=Academic+%2F+Researcher+%2F+Journalist+%2F+Student&countries=US&sectors=Accommodation&sectors=Apparel&sectors=Apparel+Accessories&sectors=Footwear&sectors=Home+Accessories&sectors=Home+Textiles&sectors=Jewelry&sectors=Leather&sectors=Material+Production&sectors=Printing&sectors=Renting&sectors=Sporting+Goods&sectors=Textiles&facility_type=Final+Product+Assembly&facility_type=Textile+or+Material+Production&processing_type=Final+Product+Assembly&processing_type_exact=Final+Product+Assembly&sort_by=contributors_desc";

test.beforeAll(setup);

const GUEST_LANGUAGES = [
  { label: "বাংলা", href: "https://info.opensupplyhub.org/bangladesh" },
  { label: "简体中文", href: "https://info.opensupplyhub.org/facilities-chinese" },
  { label: "India", href: "https://info.opensupplyhub.org/india" },
  { label: "Português", href: "https://info.opensupplyhub.org/brasil" },
  { label: "Türkçe", href: "https://info.opensupplyhub.org/turkey" },
] as const;

test.describe("[@regression] Guest users", () => {
  test("[@regression] OSDEV-1255: Guest users can switch languages via the Language menu", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();

    await mainPage.expectLanguageButtonVisible();
    await mainPage.openLanguageMenu();
    await mainPage.expectLanguageOptions(GUEST_LANGUAGES);

    const bangla = GUEST_LANGUAGES[0];
    await Promise.all([
      page.waitForURL(bangla.href),
      mainPage.chooseLanguage(bangla.label),
    ]);
    await expect(page).toHaveURL(bangla.href);
  });

  test("[@regression] OSDEV-1249: Guest user can search for facilities by country", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.searchByCountry("Bangladesh");
    await mainPage.submitFindFacilities("BD");
    await mainPage.expectSuccessfulCountrySearch("BD");
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1253: Guest user can search for facilities with accented characters", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const accentedQuery = "São";

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.searchByName(accentedQuery);
    await mainPage.submitNameSearch(accentedQuery);
    await mainPage.expectSuccessfulNameSearch(accentedQuery);
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1254: Guest user can sort Map results including ascending contributors", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await page.setViewportSize({ width: 1440, height: 1080 });

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.submitFindFacilities();
    await mainPage.expectSearchResults();
    await loginPage.expectGuestSignedOut();

    await mainPage.expectSortByVisible();
    await mainPage.expectSortApplied("contributors_desc");
    await mainPage.expectSortOptions();
    await mainPage.expectFirstLocationsSortedByContributors("desc");

    const ascending = await mainPage.selectSortBy("contributors_asc");
    await mainPage.expectFirstLocationsMatchApi(ascending.features);
    await mainPage.expectFirstLocationsSortedByContributors("asc");

    const nameAsc = await mainPage.selectSortBy("name_asc");
    await mainPage.expectFirstLocationsMatchApi(nameAsc.features);

    const nameDesc = await mainPage.selectSortBy("name_desc");
    await mainPage.expectFirstLocationsMatchApi(nameDesc.features);
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3294: Guest user can copy the search link from results", async ({
    page,
    context,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await mainPage.goToFacilitiesSearch(GUEST_COPY_SEARCH_PATH);
    await loginPage.expectGuestSignedOut();
    await mainPage.expectSearchResults();
    await mainPage.expectCopyLinkVisible();

    const resultCount = await mainPage.getResultsCount();
    expect(resultCount).toBeGreaterThan(0);
    await mainPage.expectResultsCount(resultCount);

    const copiedUrl = await mainPage.copySearchLink();
    await mainPage.expectCopiedSearchLinkMatchesCurrentPage(copiedUrl);

    const sharedPage = await context.newPage();
    const sharedMain = new MainPage(sharedPage, BASE_URL!);
    const sharedLogin = new LoginPage(sharedPage, BASE_URL!);
    await sharedMain.openCopiedSearchLink(copiedUrl);
    await sharedMain.expectSearchResults();
    await sharedMain.expectResultsCount(resultCount);
    await sharedLogin.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3290: Guest user can reset search / reset drawer filters", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const facilitiesApi = new FacilitiesApi(page);
    const catalogCountPromise = facilitiesApi.totalCount();

    await mainPage.goToFacilitiesSearch(GUEST_COPY_SEARCH_PATH);
    await loginPage.expectGuestSignedOut();
    await mainPage.expectSearchResults();
    await mainPage.expectFilteredSearchApplied();

    const filteredCount = await mainPage.getResultsCount();
    expect(filteredCount).toBeGreaterThan(0);
    await mainPage.expectResultsCount(filteredCount);

    await mainPage.resetSearchFilters();
    await mainPage.expectSearchFiltersCleared();

    const { count: unfilteredApiCount } = await mainPage.submitResultsSearch();
    const catalogCount = await catalogCountPromise;
    expect(unfilteredApiCount).toBe(catalogCount);
    await mainPage.expectResultsCount(catalogCount);
    expect(catalogCount).toBeGreaterThan(filteredCount);
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1250: Guest user can view a facility profile", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const locationPage = new LocationPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.submitFindFacilities();
    await mainPage.expectSearchResults();

    const osId = await mainPage.openFirstLocation();
    await locationPage.expectOpened(osId);
    await locationPage.expectGeneralInformationLoaded();
    await locationPage.expectGeographicInformationWithMap();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1251: Guest user sees Coordinates on the facility profile", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const locationPage = new LocationPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.submitFindFacilities();
    await mainPage.expectSearchResults();

    const osId = await mainPage.openFirstLocation();
    await locationPage.expectOpened(osId);
    await locationPage.expectCoordinatesDisplayed();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1245: Guest user can sign in", async ({ page }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.completeLoginForm(USER_EMAIL!, USER_PASSWORD!);
    await loginPage.expectSignedIn();
    await loginPage.verifyMainPageLogin(USER_EMAIL!);
  });

  test("[@regression] OSDEV-1244: Guest user can sign out", async ({ page }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.completeLoginForm(USER_EMAIL!, USER_PASSWORD!);
    await loginPage.expectSignedIn();

    await loginPage.logoutFromMainPage();
  });

  test("[@regression] OSDEV-1247: Guest user can recover their password", async ({ page }) => {
    skipIfMutatingNotAllowed(test);
    const { BASE_URL, USER_EMAIL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.openForgotPasswordDialog();
    await loginPage.completePasswordResetRequest(USER_EMAIL!);
    await loginPage.expectPasswordResetInstructionsSent();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1396: Guest user can sign up", async ({ page }) => {
    skipIfMutatingNotAllowed(test);
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const registerPage = new RegisterPage(page, BASE_URL!);
    const email = uniqueSignupEmail(USER_EMAIL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.openRegisterFromLogin();

    await registerPage.expectRegisterForm();
    await registerPage.completeSignUp({
      email,
      password: USER_PASSWORD!,
      organizationName: `E2E Signup ${Date.now()}`,
      organizationDescription: "Automated e2e signup for OSDEV-1396",
    });
    await registerPage.expectRegistrationSuccess();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1246: Guest user sees email already exists error when signing up with an existing email in different letter casing", async ({
    page,
  }) => {
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const registerPage = new RegisterPage(page, BASE_URL!);
    const email = emailWithDifferentCasing(USER_EMAIL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.openRegisterFromLogin();

    await registerPage.expectRegisterForm();
    await registerPage.completeSignUp(
      {
        email,
        password: USER_PASSWORD!,
        organizationName: `E2E Duplicate Casing ${Date.now()}`,
        organizationDescription: "Automated e2e signup for OSDEV-1246",
      },
      400,
    );
    await registerPage.expectEmailAlreadyExistsError();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-1248: Guest user can change profile after logging in", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const settingsPage = new SettingsPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await loginPage.openLoginFromHeader();
    await loginPage.expectLoginForm();
    await loginPage.completeLoginForm(USER_EMAIL!, USER_PASSWORD!);
    await loginPage.expectSignedIn();

    await loginPage.openSettings();
    await settingsPage.expectProfileForm(USER_EMAIL!);

    const original = await settingsPage.getProfileDetails();
    const updated = {
      description: `E2E profile ${Date.now()}`,
      website: `https://example.com/e2e-profile-${Date.now()}`,
    };

    try {
      await settingsPage.fillProfile(updated);
      await settingsPage.saveProfile();
      await settingsPage.expectUpdatedProfileToast();

      await page.reload({ waitUntil: "networkidle" });
      await settingsPage.expectProfileForm(USER_EMAIL!);
      await settingsPage.expectProfileDetails({
        name: original.name,
        ...updated,
      });
    } finally {
      await settingsPage.fillProfile(original);
      await settingsPage.saveProfile();
      await page.reload({ waitUntil: "networkidle" });
      await settingsPage.expectProfileDetails(original);
    }
  });

  test("[@regression] OSDEV-3286: Guest user can open Add Data from the navbar and see the login required notice", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.openAddData();
    await loginPage.expectLoginRequiredNotice(
      "Log in to contribute to Open Supply Hub",
      "Contribute",
    );
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3287: Guest user is blocked from /lists, /settings, and /claimed with a login required notice", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.goTo("/lists");
    await loginPage.expectLoginRequiredNotice(
      "Sign in to view your Open Supply Hub lists",
      "My Lists",
    );

    await mainPage.goTo("/settings");
    await loginPage.expectLoginRequiredNotice(
      "Log in to update your account settings",
      "Settings",
    );

    await mainPage.goTo("/claimed");
    await loginPage.expectLoginRequiredNotice(
      "Sign in to view your Open Supply Hub facility claims.",
      "My Claimed Facilities",
    );
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3288: Guest user can accept or reject the cookie consent banner", async ({
    browser,
  }) => {
    const { BASE_URL } = process.env;

    for (const action of ["accept", "reject"] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const mainPage = new MainPage(page, BASE_URL!);
      const loginPage = new LoginPage(page, BASE_URL!);

      await mainPage.goTo();
      await mainPage.expectCookieBannerVisible();
      await loginPage.expectGuestSignedOut();

      if (action === "accept") {
        await mainPage.acceptCookieBanner();
      } else {
        await mainPage.rejectCookieBanner();
      }
      await mainPage.expectCookieBannerHidden();
      await loginPage.expectGuestSignedOut();
      await context.close();
    }
  });

  test("[@regression] OSDEV-3295: Guest user sees login required when choosing Suggest Correction", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const locationPage = new LocationPage(page, BASE_URL!);
    const osId = (await new FacilitiesApi(page).unclaimedOpen()).id;

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await locationPage.goToOsId(osId);
    await locationPage.expectSuggestCorrectionVisible();
    await locationPage.chooseSuggestCorrection();
    await loginPage.expectLoginRequiredNotice(
      "Log in to contribute to Open Supply Hub",
      "Production Location Information",
    );
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3296: Guest user sees login required when choosing I want to claim this production location", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const locationPage = new LocationPage(page, BASE_URL!);
    const osId = (await new FacilitiesApi(page).unclaimedOpen()).id;

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await locationPage.goToOsId(osId);
    await locationPage.expectClaimCtaVisible();
    await locationPage.chooseClaim();
    await loginPage.expectLoginRequiredNotice(
      "Log in to claim a production location on Open Supply Hub",
      "Claim this production location",
    );
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3297: Guest user sees a login prompt when choosing Report Closure / Move or Report Reopened", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const locationPage = new LocationPage(page, BASE_URL!);
    const facilitiesApi = new FacilitiesApi(page);
    const openOsId = (await facilitiesApi.unclaimedOpen()).id;
    const closedOsId = await facilitiesApi.closedOsId();

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await locationPage.goToOsId(openOsId);
    await locationPage.expectReportStatusLabel("Report Closure / Move");
    await locationPage.chooseReportStatus();
    await locationPage.expectReportStatusLoginPrompt("closed");

    await locationPage.goToOsId(closedOsId);
    await locationPage.expectReportStatusLabel("Report Reopened");
    await locationPage.chooseReportStatus();
    await locationPage.expectReportStatusLoginPrompt("reopened");
    await locationPage.closeReportStatusDialog();
    await loginPage.expectGuestSignedOut();
  });

  test("[@regression] OSDEV-3298: Guest user sees claimed badge and closed ribbon on search results", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);
    const loginPage = new LoginPage(page, BASE_URL!);
    const facilitiesApi = new FacilitiesApi(page);
    const claimedOsId = (await facilitiesApi.withApprovedClaim()).id;
    const closedOsId = await facilitiesApi.closedOsId();

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();
    await loginPage.expectGuestSignedOut();

    await mainPage.openSearchForOsId(claimedOsId);
    await mainPage.expectClaimedBadgeOnResult(claimedOsId);

    await mainPage.openSearchForOsId(closedOsId);
    await mainPage.expectClosedRibbonOnResult(closedOsId);
    await loginPage.expectGuestSignedOut();
  });
});
