import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";

test.beforeAll(setup);

test("OSDEV-1232: Facilities. Invalid search", async ({ page }) => {
  const { BASE_URL } = process.env;

  // Navigate to the base URL
  await page.goto(BASE_URL!);

  // Define an invalid search query
  const invalidSearchQuery = "invalid ABRACADABRA";

  // Click on the search input field and fill it with the invalid query
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page.getByPlaceholder("e.g. ABC Textiles Limited").fill(invalidSearchQuery);

  // Click the "Find Facilities" button to perform the search
  await page.getByRole("button", { name: "Find Facilities" }).click();

  // Wait for the facilities API call to return a 200 status
  await page.waitForResponse(
    async (resp) => resp.url().includes(`api/facilities/?q=`) && resp.status() === 200
  );

  // Assert that the "No facilities matching this" message is visible
  await expect(page.getByText("No facilities matching this")).toBeVisible();
});

test("OSDEV-1232: Facilities. Valid search", async ({ page }) => {
  const { BASE_URL } = process.env;

  // Navigate to the base URL
  await page.goto(BASE_URL!);

  // Define a valid search query
  const validSearchQuery = "coffee factory";

  // Click on the search input field and fill it with the valid query
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page.getByPlaceholder("e.g. ABC Textiles Limited").fill(validSearchQuery);

  // Click the "Find Facilities" button to perform the search
  await page.getByRole("button", { name: "Find Facilities" }).click();

  // Wait for the facilities API call to return a 200 status
  await page.waitForResponse(
    async (resp) => resp.url().includes("api/facilities/?q=") && resp.status() === 200
  );

  // Assert that the search results are displayed
  await expect(page.getByText("# Contributors")).toBeVisible();

  // Click the first facility link in the search results
  const facilityLink = page.locator('a[href*="/facilities/"]').first();
  await facilityLink.scrollIntoViewIfNeeded();
  await facilityLink.waitFor({ state: "visible" });

  await Promise.all([
    page.waitForURL(/\/facilities\//),
    facilityLink.click({ force: true }),
  ]);

  // Assert that the facility page contains the search query
  await expect(page.getByText(validSearchQuery).first()).toBeVisible();

});

test("OSDEV-1232: Facilities. OSID search", async ({ page }) => {
  const { BASE_URL } = process.env;

  // Navigate to the base URL
  await page.goto(BASE_URL!);

  // Define a valid search query
  const validSearchQuery = "Car factory";

  // Click on the search input field and fill it with the valid query
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page.getByPlaceholder("e.g. ABC Textiles Limited").fill(validSearchQuery);

  // Click the "Find Facilities" button to perform the search
  await page.getByRole("button", { name: "Find Facilities" }).click();

  // Wait for the facilities API call to return a 200 status
  await page.waitForResponse(
    async (resp) => resp.url().includes("api/facilities/?q=") && resp.status() === 200
  );

  // Assert that the search results are displayed
  await expect(page.getByText("# Contributors")).toBeVisible();

  // Click the first facility link in the search results
  const facilityLink = page.locator('a[href*="/facilities/"]').first();
  await facilityLink.scrollIntoViewIfNeeded();
  await facilityLink.waitFor({ state: "visible" });

  await Promise.all([
    page.waitForURL(/\/facilities\//),
    facilityLink.click({ force: true }),
  ]);

  // Copy the OSID from the facility page
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Copy OS ID" }).click();
  const osId = await page.evaluate(async () => await navigator.clipboard.readText());
  await expect(page.getByText("Copied OS ID to clipboard✖")).toBeVisible();

  // Navigate back to the search results
  await page.getByRole("button", { name: "Back to search results" }).click();

  // Perform a search using the copied OSID
  await page.getByPlaceholder("e.g. ABC Textiles Limited").fill(osId);
  await page.getByRole("button", { name: "Search" }).first().click();

  // Wait for the facilities API call to return a 200 status
  await page.waitForResponse(
    async (resp) => resp.url().includes("api/facilities/?q=") && resp.status() === 200
  );

  // Assert that the search results contain the OSID
  await expect(page.getByText(osId)).toBeVisible();
});

// Test for country search
const countriesToTest = ['United States', 'Australia', 'United Kingdom', 'South Africa'];

countriesToTest.forEach((countryName) => {
  test(`OSDEV-1232: Facilities. Country Search - ${countryName}`, async ({ page }) => {
    const { BASE_URL } = process.env;

    await page.goto(BASE_URL!);

    // Open the country dropdown
    const countryDropdown = page.locator('#COUNTRIES div').filter({ hasText: 'Select' }).nth(1);
    await countryDropdown.click();

    // Type and select country
    const countryInput = countryDropdown.locator('input');
    await countryInput.fill(countryName);
    const option = page.locator('#COUNTRIES div').filter({ hasText: countryName }).nth(1);
    await option.click();
    await page.keyboard.press('Enter');

    // Click search
    const searchButton = page.locator('button[type="submit"]', { hasText: 'Find Facilities' });
    await searchButton.waitFor({ state: 'visible' });
    await searchButton.click();

    // Assert search result contains country name
    await expect(page.getByText(countryName, { exact: true })).toBeVisible();

    // Click first facility link
    const facilityLink = page.locator('a[href*="/facilities/"]').first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: 'visible' });

    await Promise.all([
      page.waitForURL(/\/facilities\//),
      facilityLink.click({ force: true })
    ]);

    // Assert facility page contains country name
    const mainPanel = page.locator('#mainPanel');
    await mainPanel.scrollIntoViewIfNeeded();
    await expect(mainPanel).toContainText(countryName);
  });
});

// Test for facility type search
const facilityTypesToTest = ['Final Product Assembly', 'Textile or Material Production', /*'Warehousing / Distribution'*/];

facilityTypesToTest.forEach((facilityType) => {
  test(`OSDEV-1232: Facilities. Facility Type Search - ${facilityType}`, async ({ page }) => {
    const { BASE_URL } = process.env;

    await page.goto(BASE_URL!);
    await page.getByRole('button', { name: 'Find Facilities' }).click();

    // Open the FACILITY TYPE dropdown
    const typeDropdown = page.locator('#FACILITY_TYPE div').filter({ hasText: 'Select' }).first();
    await typeDropdown.click();

    // Fill and select the facility type
    const typeInput = typeDropdown.locator('input');
    await typeInput.fill(facilityType);

    const typeOption = page.locator('#FACILITY_TYPE div').filter({ hasText: facilityType }).first();
    await typeOption.click();
    await page.keyboard.press('Enter');

    // Click the search button *after* selecting the filter
    const searchButton = page.locator('button[type="submit"]', { hasText: 'Search' });
    await searchButton.waitFor({ state: 'visible' });
    await searchButton.click();

    // Assert the result page shows the selected facility type
    await expect(page.getByText(new RegExp(facilityType, 'i')).first()).toBeVisible();

    // Click the first facility link
    const facilityLink = page.locator('a[href*="/facilities/"]').first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: 'visible' });

    await Promise.all([
      page.waitForURL(/\/facilities\//),
      facilityLink.click({ force: true })
    ]);

    // Scroll and wait for the panel
const mainPanel = page.locator('#mainPanel');
await mainPanel.scrollIntoViewIfNeeded();

// Click the "more entries" button inside the first "Facility Type" block
const facilityTypeSection = page.locator('text=Facility Type').first().locator('xpath=../../..');
const moreButton = facilityTypeSection.locator('button:has-text("entries")');
await moreButton.click();

// Wait for the second "Facility Type" to appear (in slide-out)
const secondFacilityType = page.locator('text=Facility Type').nth(1);
const slideOutPanel = secondFacilityType.locator('xpath=ancestor::div[contains(@style, "translate")]');
await slideOutPanel.waitFor({ state: 'visible' });

//  Assert the expected facility type is shown in the slide-out
await expect(slideOutPanel).toContainText(new RegExp(facilityType, 'i'));;
  });
});

// Test for number of workers search

const workerRangesToTest = ['Less than 1000', '1001-5000', '5001-10000', 'More than 10000'];

const workerRangeBounds: Record<string, { min: number; max: number }> = {
  'Less than 1000': { min: 0, max: 1000 },
  '1001-5000': { min: 1001, max: 5000 },
  '5001-10000': { min: 5001, max: 10000 },
  'More than 10000': { min: 10001, max: Infinity }
};

workerRangesToTest.forEach((workerRange) => {
  test(`OSDEV-1232: Facilities. Filter by Number of Workers - ${workerRange}`, async ({ page }) => {
    const { BASE_URL } = process.env;

    await page.goto(BASE_URL!);
    await page.getByRole('button', { name: 'Find Facilities' }).click();

    // Open the NUMBER OF WORKERS dropdown
    const workersDropdown = page.locator('#NUMBER_OF_WORKERS div').filter({ hasText: 'Select' }).first();
    await workersDropdown.click();

    // Fill and select the worker range
    const workersInput = workersDropdown.locator('input');
    await workersInput.fill(workerRange);

    const option = page.locator('#NUMBER_OF_WORKERS div').filter({ hasText: workerRange }).first();
    await option.click();
    await page.keyboard.press('Enter');

    // Click the search button
    const searchButton = page.locator('button[type="submit"]', { hasText: /search/i });
    await searchButton.waitFor({ state: 'visible' });
    await searchButton.click();

    // Confirm that at least one result is shown
    const facilityLink = page.locator('a[href*="/facilities/"]').first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: 'visible' });

    // Click the first facility
    await Promise.all([
      page.waitForURL(/\/facilities\//),
      facilityLink.click({ force: true })
    ]);

    // Wait for main content to load
    const mainPanel = page.locator('#mainPanel');
    await mainPanel.scrollIntoViewIfNeeded();

    // Click the "more entries" button inside the first "Number of workers" section
    const workersSection = page.locator('text=Number of workers').first().locator('xpath=../../..');
    const moreButton = workersSection.locator('button:has-text("entries")');
    await moreButton.click();

    // Wait for the slide-out panel
    const secondWorkersSection = page.locator('text=Number of workers').nth(1);
    const slideOutPanel = secondWorkersSection.locator('xpath=ancestor::div[contains(@style, "translate")]');
    await slideOutPanel.waitFor({ state: 'visible' });

    // ✅ Extract all numbers and check if any fall within the expected range
    const { min, max } = workerRangeBounds[workerRange];
    const texts = await slideOutPanel.locator('p').allTextContents();

    const monthRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

    const workerCount = texts
      .filter(text => !monthRegex.test(text)) // exclude potential date strings
      .map(text => parseInt(text.replace(/,/g, '').trim(), 10))
      .find(num => !isNaN(num) && num >= min && num <= max);
    
    expect(workerCount, `Expected a worker count between ${min} and ${max}, but none found.`).toBeDefined();
  });
});


