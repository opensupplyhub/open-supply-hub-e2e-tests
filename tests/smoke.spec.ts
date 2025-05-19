import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import * as path from "path";
import * as fs from "fs";
import ExcelJS from "exceljs";

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
  await page.goto(`${BASE_URL}/admin/`);

  // make sure that we are on the login page of Admin Dashboard
  const title = await page.title();
  expect(title).toBe("Log in | Django site admin");
  await expect(page.getByText("Open Supply Hub Admin")).toBeVisible();

  // fill in login credentials
  const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  await page.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
  await page.getByLabel("Password").fill(USER_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();

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
  await expect(
    page.getByText(`Welcome, ${USER_ADMIN_EMAIL}`)
  ).not.toBeVisible();
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

test.describe("OSDEV-1264: Smoke: Download a list of facilities with amounts 7000 - 9900 in xlsx.", async () => {
  test("An unauthorized user cannot download a list of facilities.", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/facilities/?countries=AO&countries=BE&countries=PL&sort_by=contributors_desc`!);

    const title = await page.title();
    expect(title).toBe("Open Supply Hub");
    await page.waitForLoadState("networkidle");

    const downloadButton = page.getByRole("button", { name: "Download" });
    expect(downloadButton).toBeVisible();
    expect(downloadButton).toBeEnabled();
    downloadButton.click({ force: true });

    await page.waitForLoadState("networkidle");

    const menuItem = page.getByRole("menuitem", { name: "Excel" });
    await expect(menuItem).toBeVisible();
    menuItem.click({ force: true });

    await expect(page.getByRole("heading", { name: "Log In To Download" })).toBeVisible();
    await expect(page.getByRole("button", { name: "CANCEL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "REGISTER" })).toBeVisible();
    await expect(page.getByRole("button", { name: "LOG IN" })).toBeVisible();
  })

  test("An authorized user can download a list of facilities with amounts 7000 - 9900 in xlsx.", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/facilities/?countries=AO&countries=BE&countries=PL&sort_by=contributors_desc`!);

    page.getByRole("button", { name: "Download" }).click({ force: true });

    const menuItem = page.getByRole("menuitem", { name: "Excel" });
    await expect(menuItem).toBeVisible();

    menuItem.click({ force: true });

    page.getByRole("button", { name: "LOG IN" }).click();

    const { USER_EMAIL, USER_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_EMAIL!);
    await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();

    page.getByRole("button", { name: "Download" }).click({ force: true });
    page.getByRole("menuitem", { name: "Excel" }).click({ force: true });

    const downloadPath = path.resolve(__dirname, "downloads");
    const downloadPromise = page.waitForEvent("download");

    const download = await downloadPromise;
    const filePath = path.join(downloadPath, download.suggestedFilename());

    await download.saveAs(filePath);

    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);

    const fileName = path.basename(filePath);
    expect(fileName).toContain("facilities");
    expect(fileName).toContain(".xlsx");

    async function readXlsx(filePath: string) {
      const fileName = path.basename(filePath);
      if (!fileName.endsWith(".xlsx")) throw new Error("Invalid file type");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const rows: any[][] = [];
      if (workbook.worksheets.length === 0) {
        throw new Error("Workbook contains no sheets");
      }

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("First worksheet is null");
      }

      worksheet.eachRow((row: any) => {
        if (row.values && Array.isArray(row.values)) {
          rows.push(row.values.slice(1));
        }
      });

      return rows;
    }

    const results = page.getByText(/^\d+ results$/);
    await expect(results).toBeVisible();

    // Get count of Facilities output on the  UI
    const text = await results.textContent();
    const numberOfFacilities = parseInt(text?.match(/\d+/)?.[0] || "0", 10);
    const headerRow = 1;

    await readXlsx(filePath).then(rows => {
      expect(rows.length).toEqual(numberOfFacilities + headerRow);
    });
  })
});
