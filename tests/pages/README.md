# Page Object Model Structure

This directory contains the Page Object Model (POM) implementation for the Open Supply Hub E2E tests. The POM pattern helps maintain clean, reusable, and maintainable test code by encapsulating page-specific logic and locators.

## Structure

```
tests/pages/
├── BasePage.ts          # Base class with common functionality
├── LoginPage.ts         # Authentication for main page and admin panel
├── MainPage.ts          # Main page functionality (search, navigation, downloads)
├── AdminPage.ts         # Django admin contributor/download-limit operations
├── AdminDashboardPage.ts  # Dashboard moderation queue access and assertions
├── EmbeddedMapPage.ts   # Embedded map iframe (download limits via testEM-upto10000.html)
└── README.md           # This documentation
```

## Page Objects

### BasePage
Base class extended by all page objects.

- Navigation: (`goTo`, `getCurrentUrl()`)
- Wait helpers: (`waitForLoadState`, `waitForResponse`)
- Common interactions: (`clickButton`, `clickLink`, `fillInput`, `acceptCookiesIfPresent`)
- Assertion helpers: (`expectToBeVisible`, `expectToHaveText`, `expectToHaveValue`)

### LoginPage
Authentication flows for both the main app and Django admin.

- Main app: `loginToMainPage`, `loginViaAuthPage`, `completeLoginForm`, `logoutFromMainPage`, `verifyMainPageLogin`, `isLoggedIn`
- Admin app: `loginToAdminPanel`, `logoutFromAdminPanel`, `verifyAdminPanelLogin`, `isAdminLoggedIn`
- Utility: `getPageTitle`

### MainPage
Public main-site search, results, and download-quota UI behavior.

- Navigation/title: `goTo`, `verifyPageTitle`, `goToFilteredFacilitiesSearch`, `goToFilteredFacilitiesSearchWithReload`, `goToUnfilteredFacilitiesSearch`
- Search and filters: `searchFacilities`, `searchByOSID`, `searchByCountry`, `searchByFacilityType`, `searchByWorkerRange`, `performSearch`
- Results actions: `clickFirstFacility`, `goBackToSearchResults`, `downloadFacilities`, `downloadFacilitiesExcel`
- Download quota UI: lead-in copy, purchase button, tooltips (`expectDownloadLeadIn*`, `expectPurchaseButton*`, `expectOverQuotaPurchaseTooltip`, etc.)
- Private instance / per-search cap: `expectPerSearchDownloadLimitTooltip`, `expectResultsWithinPerSearchCap`, `expectAnnualQuotaUiHidden`
- Assertions: `expectSearchResults`, `expectNoFacilitiesMessage`, `expectFacilityInResults`, `expectOSIDInResults`, `expectCountryInResults`, `expectDownloadLoginPrompt`
- Data helpers: `getResultsCount`, `getOSIDFromLocationPage`, `getOSIDFromFacilityPage`

### AdminPage
Django admin flows for contributors and download limits.

- Contributor flow: `goToContributors`, `searchContributor`, `clickFirstContributor`, `expectChangeContributorPage`, `expectAdminEmail`
- Embed config flow: `clearEmbedConfiguration`, `setEmbedLevel`, `setEmbedLevelToDeluxe`, `saveChanges`, `expectEmbedConfigCreated`, `getEmbedConfigValue`, `expectSuccessMessageForContributor`
- Download-limit flow: `goToDownloadLimits`, `setUserFreeDownloadQuota`, `setFreeDownloadRecords`, `expectSuccessMessageForDownloadLimit`
- Waffle switches: `goToWaffleSwitches`, `setWaffleSwitchActive` (e.g. `private_instance`)

### EmbeddedMapPage
Download UI inside an embedded map loaded from `tests/data/testEM-upto10000.html`.

- Fixture: `openFixture`, `waitForMapReady`
- Embed cap (10k results per search): `expectResultsWithinEmbedCap`, `expectEmbedResultsLimitTooltip`
- Auth/download: `expectEmbedResultsLimitTooltip`, `expectDownloadMenuOptions`
- Embed has no annual quota UI: `expectAnnualQuotaUiHidden`
- Data helpers: `getResultsCount`

### AdminDashboardPage
Dashboard moderation-queue navigation and access assertions.

- Navigation: `goToModerationQueue`
- Access/state checks: `expectSignInLinkVisible`, `clickSignInLink`, `isAuthenticationRequired`
- Queue/not-found assertions: `expectModerationQueueHeading`, `expectModerationQueuePage`, `expectNotFoundHeading`
- Utility: `getPageHeading`, `isOnModerationQueuePage`

## Usage Example

```typescript
import { test } from "@playwright/test";
import { LoginPage } from "./LoginPage";
import { MainPage } from "./MainPage";

test("Example test using page objects", async ({ page }) => {
  const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;

  const loginPage = new LoginPage(page, BASE_URL!);
  const mainPage = new MainPage(page, BASE_URL!);

  await loginPage.loginToMainPage(USER_EMAIL!, USER_PASSWORD!);
  await mainPage.searchFacilities("Test Facility");
  await mainPage.expectSearchResults();
  await mainPage.expectFacilityInResults("Test Facility");
});
```

## Benefits

1. **Maintainability**: Page-specific logic is centralized
2. **Reusability**: Page objects can be used across multiple tests
3. **Readability**: Tests are more descriptive and easier to understand
4. **Reliability**: Changes to page structure only require updates in one place
5. **Separation of Concerns**: Test logic is separated from page interaction logic

## Best Practices

1. **Use descriptive method names** that clearly indicate what the method does
2. **Encapsulate locators** as private methods to hide implementation details
3. **Provide both action and verification methods** for common operations
4. **Use the base class** for common functionality to avoid code duplication
5. **Keep page objects focused** on a single page or feature area
6. **Use environment variables** for configuration rather than hardcoding values

## Adding New Page Objects

1. Create a new file extending `BasePage`
2. Define private locator methods for page elements
3. Implement public methods for page interactions
4. Import directly from the file (no index.ts needed)
5. Update this README with documentation

## Migration from Direct Playwright Usage

The existing tests have been refactored to use page objects where appropriate. Key changes:
- Replaced direct `page.goto()` with page object methods for common functionality
- Encapsulated login logic in `LoginPage`
- Centralized search and download functionality in `MainPage`
- Moved admin operations to `AdminPage`
- Some tests (like OSDEV-1232) continue to use direct Playwright code for specific requirements
