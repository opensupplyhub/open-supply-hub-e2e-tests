import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import * as path from "path";
import * as fs from "fs";


test.beforeAll(setup);

test("OSDEV-1219: Smoke: Main page. Log-in with valid credentials", async ({
  page,
}) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL!);

  // make sure that we are on the main page
  const title = await page.title();
  expect(title).toBe("Open Supply Hub");

  // navigate to the login pages
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("link", { name: "Login/Register" }).click();

  // fill in login credentials
  const { USER_EMAIL, USER_PASSWORD } = process.env;
  await page.getByLabel("Email Address").fill(USER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("button", { name: "My Account" })).toBeVisible();

  // make sure that we have successfully logged in
  await page.getByRole("button", { name: "My Account" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await page.isVisible(`text=${USER_EMAIL}`);
  await page.getByRole("button", { name: "My Account" }).click();

  // log the user out and make sure we are logged out
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page.getByText("text=My Account")).not.toBeVisible();
  await page.waitForResponse(
    async (resp) => resp.url().includes("/user-logout/") && resp.status() == 204
  );
  await expect(page.getByText("Login/Register")).toBeVisible();
});

test("OSDEV-1235: Smoke: Django Admin Panel. Log-in with valid credentials", async ({
  page,
}) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL + "/admin/"!);

  // make sure that we are on the login page of Admin Dashboard
  const title = await page.title();
  expect(title).toBe("Log in | Django site admin");
  await expect(page.getByText("Open Supply Hub Admin")).toBeVisible();

  // fill in login credentials
  const { USER_EMAIL, USER_PASSWORD } = process.env;
  await page.getByLabel("Email").fill(USER_EMAIL!);
  await page.getByLabel("Password").fill(USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByText(`Welcome, ${USER_EMAIL}`)).toBeVisible();

  // make sure that we have successfully logged in
  await expect(
    page.getByRole("link", { name: "Open Supply Hub Admin" })
  ).toBeVisible();
  await expect(page.getByText("Site administration")).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Api" }).getByRole("caption")
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "Authentication and Authorization" })
      .getByRole("caption")
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "django-waffle" }).getByRole("caption")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Log out" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent actions" })
  ).toBeVisible();

  // log the user out and make sure we are logged out
  await page.getByRole("link", { name: "Log out" }).click();
  await expect(page.getByText(`Welcome, ${USER_EMAIL}`)).not.toBeVisible();
  await expect(page.getByText("Log in again")).toBeVisible();
});

test.describe("OSDEV-1233: Smoke: API. Search for valid facilities through an endpoint", () => {
  test("Get list of facilities from `/facilities` endpoint", async ({
    request,
  }) => {
    const response = await get(request, "/api/facilities/", {
      authenticate: true,
      params: {
        page: 1,
      },
    });
    expect(response.status()).toBe(200);
    const responseBody = await response.json();

    expect(responseBody).toHaveProperty("type", "FeatureCollection");
    expect(responseBody).toHaveProperty("count");
    expect(responseBody).toHaveProperty("features");
    expect(Array.isArray(responseBody.features)).toBeTruthy();

    const firstFeature = responseBody.features[0];
    expect(firstFeature).toHaveProperty("id");
    expect(firstFeature).toHaveProperty("type", "Feature");
    expect(firstFeature).toHaveProperty("geometry");
    expect(firstFeature.geometry).toHaveProperty("type", "Point");
    expect(firstFeature.geometry).toHaveProperty("coordinates");
    expect(firstFeature).toHaveProperty("properties");
    expect(firstFeature.properties).toHaveProperty("name");
    expect(firstFeature.properties).toHaveProperty("address");
    expect(firstFeature.properties).toHaveProperty("country_code");
    expect(firstFeature.properties).toHaveProperty("os_id");
    expect(firstFeature.properties).toHaveProperty("country_name");
  });

  test("Get unauthorized response from `/facilities` endpoint", async ({
    request,
  }) => {
    const response = await get(request, "/api/facilities/", {
      authenticate: false,
    });
    expect(response.status()).toBe(401);
  });
});
test.describe("OSDEV-1812: Smoke: Moderation queue page is can be opened through the Dashboard by a Moderation manager.", () => {
    test("A moderator is able to work with the Moderation Queue page.", async ({
      page,
    }) => {
      const { BASE_URL } = process.env;
      await page.goto(BASE_URL + "/dashboard/moderation-queue/"!);

      // make sure that we can not open the Moderation queue page of Dashboard without authorization
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await page.getByRole("link", { name: "Sign in to view your Open Supply Hub Dashboard" }).click();
      await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
      // Test step 1: Only Moderator has access
      // fill in login credentials
      const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
      await page.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
      await page.getByRole("textbox", { name: "Password" }).fill(USER_ADMIN_PASSWORD!);
      await page.getByRole("button", { name: "Log In" }).click();

      // make sure that we are on the Moderation queue page of Dashboard
      await page.getByRole("button", { name: "My Account" }).click();
      await page.getByRole("link", { name: "Dashboard" }).click();
      await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

      // Test step 2: Moderation Queue link is available in the Dashboard
      const moderationQueueLink = page.getByRole("link", { name: "Moderation Queue" });
      await expect(moderationQueueLink).toBeVisible();

      // Test step 3: Moderation Queue page is opened successfully
      await moderationQueueLink.click();
      await expect(page.getByRole("heading", { name: "Dashboard / Moderation Queue" }).getByRole("link")).toBeVisible();

      // Test step 4: Moderation events can be filtered by Moderation Status, Source Type, Country Name
      async function checkFilter(id: string, option: string, label:string) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForLoadState("networkidle");
        await page.waitForSelector(`${id} .select__control`);
        const selectLocator = page.locator(`${id} .select__control`);

        await selectLocator.waitFor({ state: "visible" });
        await selectLocator.click({ force: true });
        const optionEl = page.locator(".select__option", { hasText: new RegExp(`^${option}$`) })
        await optionEl.waitFor({ state: "visible" });
        await optionEl.click({ force: true });

        await page.waitForLoadState("networkidle");

        const headers = page.locator("table thead tr th");
        const headerCount = await headers.count();
        let statusColIndex = -1;

        for (let i = 0; i < headerCount; i++) {
          const spanText = await headers.nth(i).locator('span[role="button"]').innerText();
          if (spanText.trim().startsWith(label)) {
            statusColIndex = i;
            break;
          }
        }
        if (statusColIndex === -1) throw new Error(`${label} column not found`);
        const rows = page.locator("table tbody tr");
        const rowCount = await rows.count();
        const statuses: string[] = [];

        for (let i = 0; i < rowCount; i++) {
          const cell = rows.nth(i).locator("td").nth(statusColIndex);
          const text = await cell.innerText();
          statuses.push(text.trim());
        }
        const uniqueStatuses = [...new Set(statuses)];
        expect(uniqueStatuses).toEqual([option]);
      }
      await checkFilter("#MODERATION_STATUS", "APPROVED","Moderation Status");
      await checkFilter("#DATA_SOURCE", "API", "Source Type");
      await checkFilter("#COUNTRIES", "United States", "Country");

      // Test step 5: Pagination 25/50/100 is available
      await page.reload({ waitUntil: "networkidle" }); // reset all filters
      // Check default settings for page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.getByRole("button", { name: "25" }).waitFor({ state: "visible" });
      await expect(page.locator("table tbody tr")).toHaveCount(25);
      // Set 50 items per page
      await page.getByRole("button", { name: "25" }).click();
      await page.locator("li", { hasText: "50" }).waitFor({ state: "visible" });
      await page.locator("li", { hasText: "50" }).click();
      await page.waitForLoadState("networkidle");

      await expect(page.locator("table tbody tr")).toHaveCount(50);
      // Set 50 items per page
      await page.getByRole("button", { name: "50" }).click();
      await page.locator("li", { hasText: "100" }).waitFor({ state: "visible" });
      await page.locator("li", { hasText: "100" }).click();
      await page.waitForLoadState("networkidle");

      await expect(page.locator("table tbody tr")).toHaveCount(100);

      // Test step 6: A Data Moderator can download data from active page
      const downloadPath = path.resolve(__dirname, "downloads");
      const downloadPromise = page.waitForEvent("download");

      const downloadButton = page.locator('button[aria-label="Download Excel"]');
      await expect(downloadButton).toBeVisible();
      await expect(downloadButton).toBeEnabled();
      downloadButton.click();

      const download = await downloadPromise;
      const filePath = path.join(downloadPath, download.suggestedFilename());

      await download.saveAs(filePath);

      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);

      const fileName = path.basename(filePath);
      expect(fileName).toBe("moderation_events.xlsx");

      // Test step 7: Moderation events can be opened
      const row = page.locator("table tbody tr:first-child");

      await expect(row).toBeVisible();
      await expect(row).toBeEnabled();

      const [newPage] = await Promise.all([
        page.context().waitForEvent("page"),
        row.click(),
      ]);

      await newPage.waitForLoadState('load');
      expect(newPage.url()).toContain("/dashboard/moderation-queue/");
      await expect(newPage.getByRole("heading", { name: "Dashboard / Moderation Queue / Contribution Record" })).toBeVisible();
    });

    test("A regular user does not have an access to the Moderation Queue page.", async ({
      page,
    }) => {
      const { BASE_URL } = process.env;
      await page.goto(`${BASE_URL}/dashboard/moderation-queue/`!);

      // make sure that we can not open the Moderation queue page of Dashboard without authorization
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await page.getByRole("link", { name: "Sign in to view your Open Supply Hub Dashboard" }).click();
      await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

      // fill in login with regular user credentials
      const { USER_EMAIL, USER_PASSWORD } = process.env;
      await page.getByLabel("Email").fill(USER_EMAIL!);
      await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
      await page.getByRole("button", { name: "Log In" }).click();
      await page.waitForLoadState("networkidle");

      await page.goto(`${BASE_URL}/dashboard/moderation-queue/`!);
      await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Dashboard / Moderation Queue" }).getByRole("link")
      ).not.toBeVisible();
    });
});
