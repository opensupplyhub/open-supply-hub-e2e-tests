import { test, expect, chromium } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import path from "path";

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

test.describe("OSDEV-1230: Smoke: Facilities. Upload a list in CSV format.", () => {
  test("Successful list uploading in CSV format.", async ({ page }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/contribute/multiple-locations`);

    await expect(
      page.getByRole("heading", { name: "Contribute" })
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Log in to contribute to Open Supply Hub" })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

    const { USER_EMAIL, USER_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_EMAIL!);
    await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();

    const addDataText = "Add Data";
    page
      .locator(`div.nav-item a.button:has-text("${addDataText}")`)
      .click({ force: true });
    await expect(
      page.getByRole("heading", {
        name: "Add production location data to OS Hub",
      })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Upload Multiple Locations" })
      .click();
    await expect(page.getByRole("heading", { name: "Upload" })).toBeVisible();

    const nameInput = page.getByLabel("Enter the name for this facility list");
    await nameInput.fill("DO NOT APPROVE test release");
    await expect(nameInput).toHaveValue("DO NOT APPROVE test release");

    const descriptionInput = page.getByLabel(
      "Enter a description of this facility list and include a timeframe for the list's validity"
    );
    await descriptionInput.fill("DO NOT APPROVE");
    await expect(descriptionInput).toHaveValue("DO NOT APPROVE");

    await page
      .getByRole("button", { name: /select facility list file/i })
      .click();

    const fileInput = page.locator("input[type='file']");
    const filePath = path.resolve(
      __dirname,
      "data/DO_NOT_APPROVE test release.csv"
    );
    await fileInput.setInputFiles(filePath);
    await expect(
      page.getByText(/DO_NOT_APPROVE test release\.csv/i)
    ).toBeVisible();

    const submitButton = page.getByRole("button", { name: /submit/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await page.waitForLoadState("networkidle");

    const header = page.locator("h2", {
      hasText: "Thank you for submitting your list!",
    });
    await expect(header).toBeVisible();

    const toMainButton = page.getByRole("button", {
      name: /GO TO THE MAIN PAGE/i,
    });
    await expect(toMainButton).toBeVisible();

    const refreshButton = page.getByRole("button", { name: /REFRESH/i });
    await expect(refreshButton).toBeVisible();
    await toMainButton.click();

    await page.getByRole("button", { name: "My Account" }).click();
    await page.getByRole("link", { name: "My Lists" }).click();
    await expect(page.getByRole("heading", { name: "My Lists" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Uploaded list is visible on My Lists page
    const row = page.locator("table tbody tr:first-child");
    await expect(row).toBeVisible();

    const headers = page.locator("table thead tr th");
    const columns = [
      {
        name: "Name",
        value: "DO NOT APPROVE test release",
      },
      {
        name: "Description",
        value: "DO NOT APPROVE",
      },
      {
        name: "File Name",
        value: "DO_NOT_APPROVE test release.csv",
      },
    ];

    for (const [index, column] of columns.entries()) {
      await expect(headers.nth(index)).toHaveText(column.name);
      await expect(row.locator("td").nth(index)).toHaveText(column.value);
    }
  });

  test("Upload list validation in CSV format.", async ({ page }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/contribute/multiple-locations`);

    await expect(
      page.getByRole("heading", { name: "Contribute" })
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Log in to contribute to Open Supply Hub" })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

    // fill in login credentials
    const { USER_EMAIL, USER_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_EMAIL!);
    await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();
    await page.waitForLoadState("networkidle");

    page
      .locator('div.nav-item a.button:has-text("Add Data")')
      .click({ force: true });
    await expect(
      page.getByRole("heading", {
        name: "Add production location data to OS Hub",
      })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Upload Multiple Locations" })
      .click();
    await expect(page.getByRole("heading", { name: "Upload" })).toBeVisible();

    const submitButton = page.getByRole("button", { name: /submit/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(
      page.locator(".form__field", {
        hasText: "Missing required Facility List Name.",
      })
    ).toBeVisible();
    await expect(
      page.locator(".form__field", {
        hasText: "Missing required Facility List File.",
      })
    ).toBeVisible();

    const nameInput = page.getByLabel("Enter the name for this facility list");
    await nameInput.fill(`Test name!@@%^^&*()":,./ CO. LTD`);
    await expect(nameInput).toHaveValue(`Test name!@@%^^&*()":,./ CO. LTD`);
    await submitButton.click();
    await expect(
      page.locator(".form__field", {
        hasText:
          "The List Name you entered contains invalid characters. Allowed characters include: letters, numbers, spaces, apostrophe ( ' ), comma ( , ), hyphen ( - ), ampersand ( & ), period ( . ), parentheses ( ), and square brackets ( [] ). Characters that contain accents are not allowed.",
      })
    ).toBeVisible();
  });
});

test("OSDEV-1234: Smoke: Create Embedded Map with no facilities on it.", async () => {
  const browser = await chromium.launch({ headless: true }); // set headless: false to run with UI
  const context = await browser.newContext();

  // Reset cookies and storage
  await context.clearCookies();
  await context.clearPermissions();

  // Open the admin page
  const adminPage = await context.newPage();
  // 1. Check your user in the admin panel
  const { BASE_URL } = process.env;
  await adminPage.goto(`${BASE_URL}/admin/api/contributor/`!);

  // make sure that we are on the login page of Admin Dashboard
  const title = await adminPage.title();
  expect(title).toBe("Log in | Django site admin");
  await expect(adminPage.getByText("Open Supply Hub Admin")).toBeVisible();

  // fill in login credentials
  await context.clearCookies();
  await context.clearPermissions();
  const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  await adminPage.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
  await adminPage.getByLabel("Password").fill(USER_ADMIN_PASSWORD!);
  await adminPage.getByRole("button", { name: "Log In" }).click();
  await expect(adminPage.getByText(`Welcome, ${USER_ADMIN_EMAIL}`)).toBeVisible();

  // make sure that we have successfully logged in
  await expect(
    adminPage.getByRole("link", { name: "Open Supply Hub Admin" })
  ).toBeVisible();
  await expect(adminPage.getByText("Select contributor to change")).toBeVisible();
  const searchInput = adminPage.getByRole("textbox", { name: "Search" });
  await searchInput.fill(USER_ADMIN_EMAIL!);
  await adminPage.getByRole("button", { name: "Search" }).click();
  await adminPage.waitForLoadState("networkidle");

  const firstRowLink = adminPage.locator("table#result_list tbody tr").first().locator("th.field-__str__ a");
  await firstRowLink.click();
  await adminPage.waitForLoadState("networkidle");

  await expect(adminPage.getByText("Change contributor")).toBeVisible();
  const adminInput = adminPage.locator("#id_admin");
  expect(await adminInput.locator("option:checked").textContent()).toBe(USER_ADMIN_EMAIL);

  // 2. Delete Embed config and Embed level
  const embedConfigInput = adminPage.locator("#id_embed_config");
  const embedLevelInput = adminPage.locator("#id_embed_level");


  await embedConfigInput.selectOption("");
  await embedLevelInput.selectOption("");
  expect(await embedConfigInput.locator("option:checked").textContent()).toBe("---------");
  expect(await embedLevelInput.locator("option:checked").textContent()).toBe("---------");

  await adminPage.locator("input[type='submit'][value='Save']").click();
  await adminPage.waitForLoadState("networkidle");

  await expect(adminPage.getByText("The contributor")).toBeVisible();
  await expect(adminPage.getByText("was changed successfully.")).toBeVisible();

  // 3. Check User settings
  const settingsPage = await context.newPage();
  await settingsPage.goto(`${BASE_URL}/settings/`!);
  await settingsPage.locator("button:has-text('Embed')").click();
  await settingsPage.waitForLoadState("networkidle");

  await expect(
    settingsPage.locator("text=Looking to display your supplier data on your website?")
  ).toHaveText(/Looking to display your supplier data on your website?/);
  await expect(
    settingsPage.locator("text=The Open Supply Hub offers an easy-to-use embedded map option for your website.")
  ).toHaveText(/The Open Supply Hub offers an easy-to-use embedded map option for your website./);
  await expect(
    settingsPage.locator("text=Once Embedded Map has been activated for your account, your OS Hub Embedded Map Settings will appear on this tab.")
  ).toHaveText(/Once Embedded Map has been activated for your account, your OS Hub Embedded Map Settings will appear on this tab./);
  await expect(settingsPage.getByRole("link", { name: "OS Hub Embedded Map" })).toBeVisible();

  // 4. Return to the admin panel and set to the user Embed level = Embed Delux/Custom Embed
  await firstRowLink.click();
  await adminPage.waitForLoadState("networkidle");

  await adminPage.locator("#id_embed_level").selectOption("3");
  expect(
    await adminPage.locator("#id_embed_level").locator("option:checked").textContent()
  ).toBe("Embed Deluxe / Custom Embed");

  await adminPage.locator("input[type='submit'][value='Save']").click();
  await adminPage.waitForLoadState("networkidle");

  await expect(adminPage.getByText("The contributor")).toBeVisible();
  await expect(adminPage.getByText("was changed successfully.")).toBeVisible();

  // 5. The user should see the form with settings for the embedded map
  await settingsPage.reload({ waitUntil: "networkidle" });
  await settingsPage.locator("button:has-text('Embed')").click();
  await settingsPage.waitForLoadState("networkidle");

  await expect(
    settingsPage.locator("text=Generate a customized OS Hub Embedded Map for your website.")
  ).toHaveText(/Generate a customized OS Hub Embedded Map for your website./);
  await expect(
    settingsPage.locator("text=Embed code for your website")
  ).toHaveText(/Embed code for your website/);
  await expect(
    settingsPage.locator("text=Generate a customized OS Hub Embedded Map")
  ).toHaveText(/Generate a customized OS Hub Embedded Map/);
  await expect(
    settingsPage.locator("text=Embed code for your website")
  ).toHaveText(/Embed code for your website/);
  await expect(
    settingsPage.locator("text=This list must include any additional data points you would like to display on your customized map, such as facility type, number of workers etc.")
  ).toHaveText(/This list must include any additional data points you would like to display on your customized map, such as facility type, number of workers etc./);
  await expect(settingsPage.locator("iframe")).not.toBeVisible();
  await expect(
    settingsPage.locator("text=Choose a color and enter a width and height to see a preview.")
  ).toHaveText(/Choose a color and enter a width and height to see a preview./);

  // 6. Put size for the map, for example, 100%. Waite until the map is generated
  const width = settingsPage.locator("input#width");
  await width.fill("1000");
  const height = settingsPage.locator("input#height");
  await height.fill("1000");
  await expect.poll( async () => {
    const response = await settingsPage.request.post(`${BASE_URL}/api/embed-configs/`);

    return response.status();
  }, {
    message: "POST /api/embed-configs/ succeeds",
    timeout: 10000,
  }).toBe(200);

  const checkbox = settingsPage.locator("label:has-text('100%') input[type='checkbox']");
  await checkbox.waitFor({ state: "visible" });
  await checkbox.scrollIntoViewIfNeeded();
  await expect(checkbox).not.toBeChecked();
  await checkbox.click({ force: true });
  await expect(settingsPage.getByLabel("100% width")).toBeChecked();

  await expect.poll( async () => {
    const response = await settingsPage.request.get(`${BASE_URL}/api/embed-configs/`);

    return response.status();
  }, {
    message: "GET /api/embed-configs/ succeeds",
    timeout: 10000,
  }).toBe(200);
  await expect(settingsPage.locator("button:has-text('Copy to clipboard')")).toBeVisible();

  const frame = settingsPage.frameLocator("[id^='oar-embed-'] iframe");
  await frame.locator("button", { hasText: /draw custom area/i }).click();

  const texts = await frame.locator("ul.leaflet-draw-actions > li a").allTextContents();
  expect(texts).toEqual([ "Finish", "Delete last point", "Cancel" ]);

  await adminPage.reload({ waitUntil: "networkidle" });
  const rowLink = adminPage.locator("table#result_list tbody tr").first().locator("th.field-__str__ a");
  await rowLink.click();
  await adminPage.waitForLoadState("networkidle");

  await expect(adminPage.getByText("Change contributor")).toBeVisible();
  const configInput = adminPage.locator("#id_embed_config");
  expect(await configInput.locator("option:checked").textContent()).not.toBe("---------");
  const selectedValue = await configInput.locator("option:checked").getAttribute("value");
  expect(selectedValue).not.toBe("");
});
