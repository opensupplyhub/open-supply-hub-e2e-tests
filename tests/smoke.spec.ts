import { test, expect, errors } from "@playwright/test";
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
    test.setTimeout(25 * 60 * 1000); // Set custom timeout for all test
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
    await page.waitForLoadState("networkidle");

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
    const listName = "DO NOT APPROVE test release";
    const description = "DO NOT APPROVE";
    const fileName = "DO_NOT_APPROVE test release.csv";
    await nameInput.fill(listName);
    await expect(nameInput).toHaveValue(listName);

    const descriptionInput = page.getByLabel(
      "Enter a description of this facility list and include a timeframe for the list's validity"
    );
    await descriptionInput.fill(description);
    await expect(descriptionInput).toHaveValue(description);

    await page
      .getByRole("button", { name: /select facility list file/i })
      .click();

    const fileInput = page.locator("input[type='file']");
    const filePath = path.resolve(
      __dirname,
      `data/${fileName}`
    );
    await fileInput.setInputFiles(filePath);
    await expect(
      page.getByText(/DO_NOT_APPROVE test release\.csv/i)
    ).toBeVisible();

    const submitButton = page.getByRole("button", { name: /submit/i });
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    const response = await page.waitForResponse(resp =>resp.url().includes("/api/facility-lists/") && resp.status() === 200);

    const json = await response.json();
    const listId = json.id; // if the response includes the ID
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


    // Uploaded list is visible on My Lists page
    await page.waitForSelector("table tbody tr:first-child", { timeout: 10000 });
    const row = page.locator("table tbody tr:first-child");
    await expect(row).toBeVisible();

    const headers = page.locator("table thead tr th");
    const columns = [
      {
        name: "Name",
        value: listName,
      },
      {
        name: "Description",
        value: description,
      },
      {
        name: "File Name",
        value: fileName,
      },
    ];

    for (const [index, column] of columns.entries()) {
      await expect(headers.nth(index)).toHaveText(column.name);
      await expect(row.locator("td").nth(index)).toHaveText(column.value);
    }

    await page.locator(`tr:has-text("${fileName}")`).first().click({ force: true });

    // Poll is repeatedly check whether the result is ready, with timeouts to avoid hard waits.
    await expect.poll(async () => {
      const response = await page.request.get(`${BASE_URL}/api/facility-lists/${listId}/`);
      const data = await response.json();

      return data["statuses"].length;
    }, {
      message: "/facility-lists/id return statuses(parsed)",
      intervals: [30000],
      timeout: 1600000
    }).not.toBe(0);

    await expect.poll(async () => {
      const response = await page.request.get(`${BASE_URL}/api/facility-lists/${listId}/items/?page=1&pageSize=20/`);
      const data = await response.json();
      return data["count"];
    }, {
      message: "/facility-lists/id return statuses(parsed)",
      intervals: [30000],
      timeout: 1600000
    }).not.toBe(0);

    await page.goto(`${BASE_URL}/lists/${listId}`);
    await page.waitForLoadState("networkidle");

    // Post uploading errors occurred while parsing your list.
    await page.waitForSelector(`h2:has-text("${listName}")`);
    await expect(
      page.getByRole("heading", { name: "List Status" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "PENDING" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Download formatted file/i })).toBeVisible();
    await expect(page.getByText( /Download submitted file/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Back to lists/i })).toBeVisible();

    // Post uploading errors occurred while parsing your list.
    await page.waitForSelector(`h2:has-text("${listName}")`);
    await expect(
      page.getByRole("heading", { name: "List Status" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "PENDING" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Download formatted file/i })).toBeVisible();
    await expect(page.getByText( /Download submitted file/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Back to lists/i })).toBeVisible();
    await page.evaluate(() => {
      window.scrollBy(0, 100); // scroll down 100px
    });

    await page.locator(".select__value-container").click();
    await page.locator(".select__option:has-text('ERROR_PARSING')").click();
    await expect(page.locator(".select__multi-value__label")).toHaveText(/ERROR_PARSING/);
    await page.waitForLoadState("networkidle");

    const errorRows = page.locator("table tbody tr");
    expect(await errorRows.count()).toBe(1);
    await errorRows.click();
    await page.evaluate(() => {
      window.scrollBy(0, 100); // scroll down 100px
    });

    await expect(page.locator("text=Errors")).toBeVisible();
    await expect(page.locator("text=Could not find a country code for 'Sp'ain'.")).toBeVisible();
  });

  test("The list validation before upload.", async ({ page }) => {
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
      .locator("div.nav-item a.button:has-text('Add Data')")
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
    await submitButton.scrollIntoViewIfNeeded();
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
