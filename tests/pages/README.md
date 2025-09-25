# Page Object Model Structure

This directory contains the Page Object Model (POM) implementation for the Open Supply Hub E2E tests. The POM pattern helps maintain clean, reusable, and maintainable test code by encapsulating page-specific logic and locators.

## Structure

```
tests/pages/
├── BasePage.ts          # Base class with common functionality
├── LoginPage.ts         # Authentication for main page and admin panel
├── MainPage.ts          # Main page functionality (search, navigation, downloads)
├── AdminPage.ts         # Admin panel functionality
└── README.md           # This documentation
```

## Page Objects

### BasePage
The foundation class that provides common functionality for all page objects:
- Navigation methods (`goto`, `waitForLoadState`)
- Common interactions (`clickButton`, `clickLink`, `fillInput`)
- Assertion helpers (`expectToBeVisible`, `expectToHaveText`, `expectToHaveValue`)

### LoginPage
Handles authentication for both the main application and admin panel:
- `loginToMainPage(email, password)` - Login to main application
- `logoutFromMainPage()` - Logout from main application
- `loginToAdminPanel(email, password)` - Login to Django admin
- `logoutFromAdminPanel()` - Logout from admin panel
- `verifyMainPageLogin(email)` - Verify successful main page login
- `verifyAdminPanelLogin(email)` - Verify successful admin login

### MainPage
Manages main page functionality including search and navigation:
- `goto()` - Navigate to main page and verify title
- `searchFacilities(query)` - Search for facilities by name
- `searchByOSID(osId)` - Search by OS ID
- `searchByCountry(country)` - Filter by country
- `searchByFacilityType(type)` - Filter by facility type
- `searchByWorkerRange(range)` - Filter by worker range
- `clickFirstFacility()` - Click first facility in results
- `downloadFacilitiesExcel()` - Download facilities as Excel
- Various expectation methods for search results

### AdminPage
Handles Django admin panel functionality:
- `gotoContributors()` - Navigate to contributors admin page
- `searchContributor(email)` - Search for a specific contributor
- `clickFirstContributor()` - Click first contributor in results
- `clearEmbedConfiguration()` - Clear embed settings
- `setEmbedLevelToDeluxe()` - Set embed level to deluxe
- `saveChanges()` - Save admin changes
- Various verification methods



## Usage Example

```typescript
import { LoginPage, MainPage } from "./pages/LoginPage";
import { MainPage } from "./pages/MainPage";

test("Example test using page objects", async ({ page }) => {
  const { BASE_URL, USER_EMAIL, USER_PASSWORD } = process.env;
  
  const loginPage = new LoginPage(page, BASE_URL!);
  const mainPage = new MainPage(page, BASE_URL!);

  // Navigate and login
  await mainPage.goto();
  await mainPage.verifyPageTitle();
  await loginPage.loginToMainPage(USER_EMAIL!, USER_PASSWORD!);

  // Perform search
  await mainPage.searchFacilities("Test Facility");
  await mainPage.expectSearchResults();

  // Verify results
  await mainPage.clickFirstFacility();
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