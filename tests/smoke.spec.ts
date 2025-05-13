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

test.only("OSDEV-1813: Smoke: SLC page is opened, user is able to search by Name and Address, or by OS ID", async ({
  page,
}) => {
  const { BASE_URL } = process.env;
  await page.goto(`${BASE_URL}/contribute/single-location`!);

  await expect(
    page.getByRole("heading", { name: "Production Location Search" })
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Log in to contribute to Open Supply Hub" })
    .click();
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

  const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  await page.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(USER_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();

  await page.getByRole("link", { name: "Add Data" }).click();
  await expect(
    page.getByRole("button", { name: "Add a Single Location" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Add a Single Location" }).click();
  await expect(
    page.getByRole("heading", { name: "Production Location Search" })
  ).toBeVisible();

  const buttonSearchByName = page.locator("button", {
    hasText: "Search by Name and Address",
  });
  await buttonSearchByName.waitFor({ state: "visible" });

  const isSelected = await buttonSearchByName.getAttribute("aria-selected");
  expect(isSelected).toBe("true");
  await expect(
    page.getByRole("heading", { name: "Production Location Details" })
  ).toBeVisible();

  const buttonSearchByOSID = page.locator("button", {
    hasText: "Search by OS ID",
  });
  await buttonSearchByOSID.waitFor({ state: "visible" });

  const isNotSelected = await buttonSearchByOSID.getAttribute("aria-selected");
  expect(isNotSelected).toBe("false");

  await page.getByPlaceholder("Type a name").fill("MONTEFISH d.o.o");
  await page
    .getByPlaceholder("Address")
    .fill("Dumidan Tivatsko polje, Tivat, Tivat Municipality");

  async function selectOption(id: string, option: string, label: string) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(`${id} .select__control`);
    const selectLocator = page.locator(`${id} .select__control`);

    await selectLocator.waitFor({ state: "visible" });
    await selectLocator.click({ force: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const optionEl = page.locator(".select__option", {
      hasText: new RegExp(`^${option}$`),
    });
    await optionEl.waitFor({ state: "visible" });
    await optionEl.click({ force: true });
  }

  await selectOption("#countries", "Montenegro", "Country");

  await page.getByRole("button", { name: "Search" }).click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );

  await expect(
    page.getByRole("heading", { name: "Search results" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "MONTEFISH d.o.o" })
  ).toBeVisible();
  await page
    .locator(
      'h3:has-text("MONTEFISH d.o.o") >> .. >> .. >> button:has-text("Select")'
    )
    .click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );

  await expect(
    page.getByRole("heading", { name: "Production Location Information" })
  ).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("MONTEFISH d.o.o");
  await expect(page.locator("#address")).toHaveValue(
    "Dumidan Tivatsko polje, Tivat, Tivat Municipality"
  );
  await expect(page.locator("#country")).toHaveText("Montenegro");
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();

  await page.getByRole("button", { name: "Go Back" }).click();
  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );
  await page.getByRole("button", { name: "I don't see my Location" }).click();

  await expect(
    page.locator("#confirm-not-found-location-dialog-title")
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Yes, add a new production location" })
    .click();

  await expect(page.locator("#name")).toHaveValue("");
  await expect(page.locator("#address")).toHaveValue("");
  await expect(page.locator('#country input[type="text"]')).toHaveValue("");

  const buttonSubmit = page.getByRole("button", { name: "Submit" });
  await expect(buttonSubmit).toBeVisible();
  await expect(buttonSubmit).toBeDisabled();

  await page.goto(`${BASE_URL}/contribute/single-location?tab=os-id`!);
  await expect(
    page.getByRole("heading", { name: "Know the OS ID for your location?" })
  ).toBeVisible();

  await page.getByPlaceholder("Enter the OS ID").fill("INVALIDOSID");
  const buttonSeashByID = page.getByRole("button", { name: "Search by ID" });
  await expect(buttonSeashByID).toBeVisible();
  await expect(buttonSeashByID).toBeDisabled();

  await page.getByPlaceholder("Enter the OS ID").fill("INVALIDOSID1234");
  await expect(buttonSeashByID).toBeVisible();
  await expect(buttonSeashByID).not.toBeDisabled();
  await buttonSeashByID.click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 404
  );

  await expect(
    page.getByRole("heading", {
      name: "We didn't find a production location with that ID.",
    })
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Search by Name and Address" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search for another ID" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to ID search" }).click();
  await page.getByPlaceholder("Enter the OS ID").fill("ME2024327W4WD1G");
  await buttonSeashByID.click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );
  await expect(
    page.getByRole("button", { name: "No, search by name and address" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Yes, add data and claim" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, add data and claim" }).click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );

  await expect(
    page.getByRole("heading", { name: "Production Location Information" })
  ).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("MONTEFISH d.o.o");
  await expect(page.locator("#address")).toHaveValue(
    "Dumidan Tivatsko polje, Tivat, Tivat Municipality"
  );

  await expect(page.locator("#country")).toHaveText("Montenegro");
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();

  const inputLocator = page.locator(
    'input[data-testid="switch-additional-info-fields"]'
  );
  await inputLocator.waitFor({ state: "visible" });
  await expect(inputLocator).not.toBeChecked();
  inputLocator.click();
  await expect(inputLocator).toBeChecked();

  await expect(page.locator("h2", { hasText: "Sector(s)" })).toBeVisible();
  await expect(page.locator('input[aria-label="Select sector"]')).toHaveValue(
    ""
  );

  // Product Type(s)
  await expect(
    page.locator("h2", { hasText: "Product Type(s)" })
  ).toBeVisible();
  await expect(
    page.locator('input[aria-label="Enter product type(s)"]')
  ).toHaveValue("");

  // Location Type(s)
  await expect(
    page.locator("h2", { hasText: "Location Type(s)" })
  ).toBeVisible();
  await expect(page.locator('input[aria-label="Location type"]')).toHaveValue(
    ""
  );

  // Processing Type(s)
  await expect(
    page.getByRole("heading", { name: "Processing Type(s)" })
  ).toBeVisible();
  await expect(page.locator('input[aria-label="Processing Type"]')).toHaveValue(
    ""
  );

  // Number of Workers
  await expect(
    page.locator("h2", { hasText: "Number of Workers" })
  ).toBeVisible();
  await expect(page.locator("#number_of_workers")).toHaveValue("");

  // Parent Company
  await expect(page.locator("h2", { hasText: "Parent Company" })).toBeVisible();
  await expect(page.locator("#parent_company")).toHaveValue("");
});
