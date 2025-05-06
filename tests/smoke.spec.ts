import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";

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

test("OSDEV-1234: Smoke: Create Embedded Map with no facilities on it.", async ({
  page,
}) => {
  // 1. Check your user in the admin panel
  const { BASE_URL } = process.env;
  await page.goto(`${BASE_URL}/admin/api/contributor/`!);

  // make sure that we are on the login page of Admin Dashboard
  const title = await page.title();
  expect(title).toBe("Log in | Django site admin");
  await expect(page.getByText("Open Supply Hub Admin")).toBeVisible();

  // fill in login credentials
  const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  await page.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
  await page.getByLabel("Password").fill(USER_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByText(`Welcome, ${USER_ADMIN_EMAIL}`)).toBeVisible();

  // make sure that we have successfully logged in
  await expect(
    page.getByRole("link", { name: "Open Supply Hub Admin" })
  ).toBeVisible();
  await expect(page.getByText("Select contributor to change")).toBeVisible();
  const searchInput = page.getByRole("textbox", { name: "Search" });
  await searchInput.fill(USER_ADMIN_EMAIL!);
  await page.getByRole("button", { name: "Search" }).click();
  await page.reload({ waitUntil: "networkidle" });

  const firstRowLink = page.locator("table#result_list tbody tr").first().locator("th.field-__str__ a");
  await firstRowLink.click();
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.getByText("Change contributor")).toBeVisible();
  const adminInput = page.locator("#id_admin");
  expect(await adminInput.locator("option:checked").textContent()).toBe(USER_ADMIN_EMAIL);

  // 2. Delete Embed config and Embed level
  const embedConfigInput = page.locator("#id_embed_config");
  const embedLevelInput = page.locator("#id_embed_level");


  await embedConfigInput.selectOption('');
  await embedLevelInput.selectOption('');
  expect(await embedConfigInput.locator("option:checked").textContent()).toBe("---------");
  expect(await embedLevelInput.locator("option:checked").textContent()).toBe("---------");



});
