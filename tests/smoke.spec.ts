import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import path from "path";
import fs from "fs";

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

const uploadScenarios = [
  {
    format: "CSV",
    fileName: "DO_NOT_APPROVE test release.csv",
    listName: "DO NOT APPROVE test release CSV",
    description: "DO NOT APPROVE Test CSV upload",
  },
  {
    format: "XLSX",
    fileName: "DO_NOT_APPROVE test release.xlsx",
    listName: "DO NOT APPROVE test release XLSX",
    description: "DO NOT APPROVE Test XLSX upload",
  },
];

uploadScenarios.forEach(({ format, fileName, listName, description }) => {
  test.describe(`${format === "CSV" ? "OSDEV-1230" : "OSDEV-1231"}: Smoke: Facilities. Upload a list in ${format} format.`, () => {
    test(`Successful list uploading in ${format} format.`, async ({ page }) => {
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

      // Log in to the main page
      const { USER_EMAIL, USER_PASSWORD } = process.env;
      await page.getByLabel("Email").fill(USER_EMAIL!);
      await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
      await page.getByRole("button", { name: "Log In" }).click();
      await page.waitForLoadState("networkidle");

      // Navigate to Upload Multiple Locations page
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

      // Fill in the form fields
      const nameInput = page.getByLabel("Enter the name for this facility list");
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
      const filePath = path.resolve(__dirname, `data/${fileName}`);
      await fileInput.setInputFiles(filePath);
      await expect(
        page.getByText(new RegExp(fileName, "i"))
      ).toBeVisible();

      // Submit the form
      const submitButton = page.getByRole("button", { name: /submit/i });
      await submitButton.scrollIntoViewIfNeeded();
      await expect(submitButton).toBeEnabled();
      await submitButton.click();
      const response = await page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/facility-lists/") && resp.status() === 200
      );

      // Get the list ID
      const data = await response.json();
      const listId = data.id;
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
      await page.waitForSelector("table tbody tr:first-child", {
        timeout: 10000,
      });
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

      await page
        .locator(`tr:has-text("${fileName}")`)
        .first()
        .click({ force: true });

      // Poll repeatedly checks whether the result is ready, with timeouts to avoid hard waits.
      await expect
        .poll(
          async () => {
            const response = await page.request.get(
              `${BASE_URL}/api/facility-lists/${listId}/`
            );
            const data = await response.json();
            return data["statuses"].length;
          },
          {
            message: "/facility-lists/id return statuses (parsed)",
            intervals: [30000],
            timeout: 1600000,
          }
        )
        .not.toBe(0);

      await expect
        .poll(
          async () => {
            const response = await page.request.get(
              `${BASE_URL}/api/facility-lists/${listId}/items/?page=1&pageSize=20/`
            );
            const data = await response.json();
            return data["count"];
          },
          {
            message:
              "/facility-lists/id/items/?page=1&pageSize=20 return count of parsed facilities",
            intervals: [30000],
            timeout: 1600000,
          }
        )
        .not.toBe(0);

      await page.goto(`${BASE_URL}/lists/${listId}`);
      await page.waitForLoadState("networkidle");

      // Post uploading errors occurred while parsing your list.
      await page.waitForSelector(`h2:has-text("${listName}")`);
      await expect(
        page.getByRole("heading", { name: "List Status" })
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "PENDING" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Download formatted file/i })
      ).toBeVisible();
      await expect(page.getByText(/Download submitted file/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Back to lists/i })
      ).toBeVisible();

      // Post-uploading errors occurred while parsing your list.
      await page.waitForSelector(`h2:has-text("${listName}")`);
      await expect(
        page.getByRole("heading", { name: "List Status" })
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "PENDING" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Download formatted file/i })
      ).toBeVisible();
      await expect(page.getByText(/Download submitted file/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Back to lists/i })
      ).toBeVisible();
      await page.evaluate(() => {
        window.scrollBy(0, 100); // scroll down 100px
      });

      await page.locator(".select__value-container").click();
      await page.locator(".select__option:has-text('ERROR_PARSING')").click();
      await expect(page.locator(".select__multi-value__label")).toHaveText(
        /ERROR_PARSING/
      );
      await page.waitForLoadState("networkidle");

      const errorRows = page.locator("table tbody tr");
      expect(await errorRows.count()).toBe(format === "CSV" ? 1 : 2);
      await errorRows.click();
      await page.evaluate(() => {
        window.scrollBy(0, 100); // scroll down 100px
      });

      await expect(page.locator("text=Errors")).toBeVisible();
      await expect(
        page.locator(`text=Could not find a country code for ${format === "CSV" ? "'Sp'ain'" : "'A'ustralia'"}.`)
      ).toBeVisible();
    });

    test(`The ${format} list validation before upload.`, async ({ page }) => {
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

      // Navigate to Upload Multiple Locations page
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

      const submitButton = page.getByRole("button", { name: /submit/i });
      await submitButton.scrollIntoViewIfNeeded();
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Check that the error messages are visible
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

      // Fill in the form fields with invalid values
      const nameInput = page.getByLabel("Enter the name for this facility list");
      await nameInput.fill('Test name!@@%^^&*()":,./ CO. LTD');
      await expect(nameInput).toHaveValue('Test name!@@%^^&*()":,./ CO. LTD');
      await submitButton.click();
      await expect(
        page.locator(".form__field", {
          hasText:
            "The List Name you entered contains invalid characters. Allowed characters include: letters, numbers, spaces, apostrophe ( ' ), comma ( , ), hyphen ( - ), ampersand ( & ), period ( . ), parentheses ( ), and square brackets ( [] ). Characters that contain accents are not allowed.",
        })
      ).toBeVisible();
    });
  });
});

test("OSDEV-1813: Smoke: SLC page is opened, user is able to search by Name and Address, or by OS ID", async ({
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

  const locationName = "MONTEFISH d.o.o";
  await page.getByPlaceholder("Type a name").fill(locationName);
  await page
    .getByPlaceholder("Address")
    .fill("Dumidan Tivatsko polje, Tivat, Tivat Municipality");

  async function selectOption(id: string, optionID: string) {
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForLoadState("networkidle");

    const selectQuery = `${id} .select__control .select__value-container`;
    await page.waitForSelector(selectQuery);

    const selectLocator = page.locator(selectQuery);
    await selectLocator.waitFor({ state: "visible" });
    await selectLocator.click();

    const optionEl = page.locator(optionID);
    await optionEl.click({ force: true });
  }

  await selectOption("#countries", "#react-select-3-option-148");
  await page.getByRole("button", { name: "Search" }).click();

  await page.waitForResponse(
    async (resp) =>
      resp.url().includes("/api/v1/production-locations/") &&
      resp.status() == 200
  );

  await expect(
    page.getByRole("heading", { name: "Search results" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: locationName })).toBeVisible();
  await page
    .locator(
      `h3:has-text("${locationName}") >> .. >> .. >> button:has-text("Select")`
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
  await expect(page.locator("#name")).toHaveValue(locationName);
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
  const buttonSearchByID = page.getByRole("button", { name: "Search by ID" });
  await expect(buttonSearchByID).toBeVisible();
  await expect(buttonSearchByID).toBeDisabled();

  await page.getByPlaceholder("Enter the OS ID").fill("INVALIDOSID1234");
  await expect(buttonSearchByID).toBeVisible();
  await expect(buttonSearchByID).not.toBeDisabled();
  await buttonSearchByID.click();

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
  await buttonSearchByID.click();

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
  await expect(page.locator("#name")).toHaveValue(locationName);
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

test.describe("OSDEV-1232: Home page search combinations", () => {
  test("OSDEV-1232: Facilities. Invalid search", async ({ page }) => {
    const { BASE_URL } = process.env;

    // Navigate to the base URL
    await page.goto(BASE_URL!);

    // Define an invalid search query
    const invalidSearchQuery = "invalid ABRACADABRA";

    // Click on the search input field and fill it with the invalid query
    await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
    await page
      .getByPlaceholder("e.g. ABC Textiles Limited")
      .fill(invalidSearchQuery);

    // Click the "Find Facilities" button to perform the search
    await page.getByRole("button", { name: "Find Facilities" }).click();

    // Wait for the facilities API call to return a 200 status
    await page.waitForLoadState("networkidle");

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
    await page
      .getByPlaceholder("e.g. ABC Textiles Limited")
      .fill(validSearchQuery);

    // Click the "Find Facilities" button to perform the search
    await page.getByRole("button", { name: "Find Facilities" }).click();

    // Wait for the facilities API call to return a 200 status
    await page.waitForLoadState("networkidle");

    // Assert that the search results are displayed
    await expect(page.getByText("# Contributors")).toBeVisible();

    // Click the first facility link in the search results
    const facilityLink = page.locator('a[href*="/facilities/"]').first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: "visible" });

    // wait for the page to load
    await page.waitForLoadState("networkidle");

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
    await page
      .getByPlaceholder("e.g. ABC Textiles Limited")
      .fill(validSearchQuery);

    // Click the "Find Facilities" button to perform the search
    await page.getByRole("button", { name: "Find Facilities" }).click();

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Assert that the search results are displayed
    await expect(page.getByText("# Contributors")).toBeVisible();

    // Click the first facility link in the search results
    const facilityLink = page.locator('a[href*="/facilities/"]').first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: "visible" });
    await facilityLink.click();

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Grab the OSID from the page
    const paragraph = page.locator("p", { hasText: "OS ID: " });
    await expect(paragraph).toBeVisible();
    const osID = (await paragraph.locator("span").textContent()) as string;

    // Navigate back to the search results
    await page.getByRole("button", { name: "Back to search results" }).click();

    // Perform a search using the copied OSID
    await page.getByPlaceholder("e.g. ABC Textiles Limited").fill(osID);
    await page.getByRole("button", { name: "Search" }).first().click();

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Assert that the search results contain the OSID
    await expect(page.getByText(osID)).toBeVisible();
  });

  // Test for country search
  const countryTestCases = [
    "United States",
    "Australia",
    "United Kingdom",
    "South Africa",
  ];

  countryTestCases.forEach((countryName) => {
    test(`OSDEV-1232: Facilities. Country Search - ${countryName}`, async ({
      page,
    }) => {
      const { BASE_URL } = process.env;
      await page.goto(BASE_URL!);

      // Open the country dropdown
      const countryDropdown = page
        .locator("#COUNTRIES div")
        .filter({ hasText: "Select" })
        .nth(1);
      await countryDropdown.click();

      // Type and select country
      const countryInput = countryDropdown.locator("input");
      await countryInput.fill(countryName);
      const option = page
        .locator("#COUNTRIES div")
        .filter({ hasText: countryName })
        .nth(1);
      await option.click();
      await page.keyboard.press("Enter");

      // Click search
      const searchButton = page.locator('button[type="submit"]', {
        hasText: "Find Facilities",
      });
      await searchButton.waitFor({ state: "visible" });
      await searchButton.click();

      // Assert search result contains country name
      await expect(page.getByText(countryName, { exact: true })).toBeVisible();

      // Click first facility link
      const facilityLink = page.locator('a[href*="/facilities/"]').first();
      await facilityLink.scrollIntoViewIfNeeded();
      await facilityLink.waitFor({ state: "visible" });

      await page.waitForLoadState("networkidle");

      // Assert facility page contains country name
      const mainPanel = page.locator("#mainPanel");
      await mainPanel.scrollIntoViewIfNeeded();
      await expect(mainPanel).toContainText(countryName);
    });
  });

  // Test for facility type search
  const facilityTypeTestCases = [
    "Final Product Assembly",
    "Textile or Material Production",
  ];

  facilityTypeTestCases.forEach((facilityType) => {
    test(`OSDEV-1232: Facilities. Facility Type Search - ${facilityType}`, async ({
      page,
    }) => {
      const { BASE_URL } = process.env;
      await page.goto(BASE_URL!);
      await page.getByRole("button", { name: "Find Facilities" }).click();
      await page.waitForLoadState("networkidle");

      // Open the FACILITY TYPE dropdown
      const typeDropdown = page
        .locator("#FACILITY_TYPE div")
        .filter({ hasText: "Select" })
        .first();
      await typeDropdown.click();

      // Fill and select the facility type
      const typeInput = typeDropdown.locator("input");
      await typeInput.fill(facilityType);

      const typeOption = page
        .locator("#FACILITY_TYPE div")
        .filter({ hasText: facilityType })
        .first();
      await typeOption.click();
      await page.keyboard.press("Enter");

      // Click the search button *after* selecting the filter
      const searchButton = page.locator('button[type="submit"]', {
        hasText: "Search",
      });
      await searchButton.waitFor({ state: "visible" });
      await searchButton.click();
      await page.waitForLoadState("networkidle");

      // Assert the result page shows the selected facility type
      await expect(
        page.getByText(new RegExp(facilityType, "i")).first()
      ).toBeVisible();

      // Click the first facility link
      const facilityLink = page.locator('a[href*="/facilities/"]').first();
      await facilityLink.scrollIntoViewIfNeeded();
      await facilityLink.waitFor({ state: "visible" });
      await facilityLink.click();

      await page.waitForLoadState("networkidle");

      // Scroll and wait for the panel
      const mainPanel = page.locator("#mainPanel");
      await mainPanel.scrollIntoViewIfNeeded();

      // Click the "more entries" button inside the first "Facility Type" block
      const facilityTypeSection = page
        .locator("text=Facility Type")
        .first()
        .locator("xpath=../../..");
      const moreButton = facilityTypeSection.locator(
        'button:has-text("entries")'
      );
      await moreButton.click();

      // Wait for the second "Facility Type" to appear (in slide-out)
      const secondFacilityType = page.locator("text=Facility Type").nth(1);
      const slideOutPanel = secondFacilityType.locator(
        'xpath=ancestor::div[contains(@style, "translate")]'
      );
      await slideOutPanel.waitFor({ state: "visible" });

      //  Assert the expected facility type is shown in the slide-out
      await expect(slideOutPanel).toContainText(new RegExp(facilityType, "i"));
    });
  });

  const workerRangeTestCases = [
    {
      range: "Less than 1000",
      min: 0,
      max: 1000,
    },
    {
      range: "1001-5000",
      min: 1001,
      max: 5000,
    },
    {
      range: "5001-10000",
      min: 5001,
      max: 10000,
    },
    {
      range: "More than 10000",
      min: 10001,
      max: Infinity,
    },
  ];

  workerRangeTestCases.forEach((testCase) => {
    test(`OSDEV-1232: Facilities. Filter by Number of Workers - ${testCase.range}`, async ({
      page,
    }) => {
      const { BASE_URL } = process.env;
      await page.goto(BASE_URL!);
      await page.getByRole("button", { name: "Find Facilities" }).click();
      await page.waitForLoadState("networkidle");

      // Open the NUMBER OF WORKERS dropdown
      const workersDropdown = page
        .locator("#NUMBER_OF_WORKERS div")
        .filter({ hasText: "Select" })
        .first();
      await workersDropdown.click();

      // Fill and select the worker range
      const workersInput = workersDropdown.locator("input");
      await workersInput.fill(testCase.range);

      const option = page
        .locator("#NUMBER_OF_WORKERS div")
        .filter({ hasText: testCase.range })
        .first();
      await option.click();
      await page.keyboard.press("Enter");

      // Click the search button
      const searchButton = page.locator('button[type="submit"]', {
        hasText: /search/i,
      });
      await searchButton.waitFor({ state: "visible" });
      await searchButton.click();
      await page.waitForLoadState("networkidle");

      // Confirm that at least one result is shown
      const facilityLink = page.locator('a[href*="/facilities/"]').first();
      await facilityLink.scrollIntoViewIfNeeded();
      await facilityLink.waitFor({ state: "visible" });
      await facilityLink.click();
      await page.waitForLoadState("networkidle");

      // Wait for main content to load
      const mainPanel = page.locator("#mainPanel");
      await mainPanel.scrollIntoViewIfNeeded();

      // Click the "more entries" button inside the first "Number of workers" section
      const workersSection = page
        .locator("text=Number of workers")
        .first()
        .locator("xpath=../../..");
      const moreButton = workersSection.locator('button:has-text("entries")');
      await moreButton.click();

      // Wait for the slide-out panel
      const secondWorkersSection = page
        .locator("text=Number of workers")
        .nth(1);
      const slideOutPanel = secondWorkersSection.locator(
        'xpath=ancestor::div[contains(@style, "translate")]'
      );
      await slideOutPanel.waitFor({ state: "visible" });

      // Extract all numbers and check if any fall within the expected range
      const { min, max } = testCase;
      const texts = await slideOutPanel.locator("p").allTextContents();

      const monthRegex =
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

      const workerCount = texts
        .filter((text) => !monthRegex.test(text)) // exclude potential date strings
        .map((text) => parseInt(text.replace(/,/g, "").trim(), 10))
        .find((num) => !isNaN(num) && num >= min && num <= max);

      expect(
        workerCount,
        `Expected a worker count between ${min} and ${max}, but none found.`
      ).toBeDefined();
    });
  });

  const combinedFilterTestCases = [
    {
      country: "United States",
      facilityType: "Final Product Assembly",
      workerRange: {
        range: "Less than 1000",
        min: 0,
        max: 1000,
      },
    },
    {
      country: "United States",
      facilityType: "Textile or Material Production",
      workerRange: {
        range: "Less than 1000",
        min: 0,
        max: 1000,
      },
    },
  ];

  combinedFilterTestCases.forEach(({ country, facilityType, workerRange }) => {
    test(`OSDEV-1232: Combined filter - ${country}, ${facilityType}, ${workerRange.range}`, async ({
      page,
    }) => {
      const { BASE_URL } = process.env;

      await page.goto(BASE_URL!);
      await page.getByRole("button", { name: "Find Facilities" }).click();
      await page.waitForLoadState("networkidle");

      // COUNTRY filter
      const countryDropdown = page
        .locator("#COUNTRIES div")
        .filter({ hasText: "Select" })
        .nth(1);
      await countryDropdown.click();

      const countryInput = countryDropdown.locator("input");
      await countryInput.fill(country);

      const countryOption = page
        .locator("#COUNTRIES div")
        .filter({ hasText: country })
        .nth(1);
      await countryOption.click();
      await page.keyboard.press("Enter");

      // FACILITY TYPE filter
      const typeDropdown = page
        .locator("#FACILITY_TYPE div")
        .filter({ hasText: "Select" })
        .first();
      await typeDropdown.click();

      const typeInput = typeDropdown.locator("input");
      await typeInput.fill(facilityType);

      const typeOption = page
        .locator("#FACILITY_TYPE div")
        .filter({ hasText: facilityType })
        .first();
      await typeOption.click();
      await page.keyboard.press("Enter");

      // NUMBER OF WORKERS filter
      const workersDropdown = page
        .locator("#NUMBER_OF_WORKERS div")
        .filter({ hasText: "Select" })
        .first();
      await workersDropdown.click();

      const workersInput = workersDropdown.locator("input");
      await workersInput.fill(workerRange.range);

      const workersOption = page
        .locator("#NUMBER_OF_WORKERS div")
        .filter({ hasText: workerRange.range })
        .first();
      await workersOption.click();
      await page.keyboard.press("Enter");

      // Click search
      const searchButton = page.locator('button[type="submit"]', {
        hasText: /search/i,
      });
      await searchButton.waitFor({ state: "visible" });
      await searchButton.click();
      await page.waitForLoadState("networkidle");

      // Click the first facility link
      const facilityLink = page.locator('a[href*="/facilities/"]').first();
      await facilityLink.scrollIntoViewIfNeeded();
      await facilityLink.waitFor({ state: "visible" });
      await facilityLink.click();
      await page.waitForLoadState("networkidle");

      // Expand and assert Facility Type
      const mainPanel = page.locator("#mainPanel");
      await mainPanel.scrollIntoViewIfNeeded();

      const facilityTypeSection = page
        .locator("text=Facility Type")
        .first()
        .locator("xpath=../../..");
      const moreTypeButton = facilityTypeSection.locator(
        'button:has-text("entries")'
      );
      await moreTypeButton.click();

      const facilityTypeSlide = page
        .locator("text=Facility Type")
        .nth(1)
        .locator('xpath=ancestor::div[contains(@style, "translate")]');
      await facilityTypeSlide.waitFor({ state: "visible" });
      await expect(facilityTypeSlide).toContainText(
        new RegExp(facilityType, "i")
      );
      await page.getByRole("button", { name: "Close" }).click();

      // Expand and assert Worker Range
      const workersSection = page
        .locator("text=Number of workers")
        .first()
        .locator("xpath=../../..");
      const moreWorkersButton = workersSection.locator(
        'button:has-text("entries")'
      );
      await moreWorkersButton.click();

      const workersSlide = page
        .locator("text=Number of workers")
        .nth(1)
        .locator('xpath=ancestor::div[contains(@style, "translate")]');
      await workersSlide.waitFor({ state: "visible" });

      const monthRegex =
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i;
      const { min, max } = workerRange;
      const workerTexts = await workersSlide.locator("p").allTextContents();

      const workerCount = workerTexts
        .filter((text) => !monthRegex.test(text))
        .map((text) => parseInt(text.replace(/,/g, "").trim(), 10))
        .find((num) => !isNaN(num) && num >= min && num <= max);

      expect(
        workerCount,
        `Expected a worker count between ${min} and ${max}, but none found.`
      ).toBeDefined();

      // Assert country still appears
      await expect(
        page.getByText(country, { exact: false }).first()
      ).toBeVisible();
    });
  });
});

test.describe("OSDEV-1812: Smoke: Moderation queue page is can be opened through the Dashboard by a Moderation manager.", () => {
  test("A moderator is able to work with the Moderation Queue page.", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/dashboard/moderation-queue/`!);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await page
      .getByRole("link", {
        name: "Sign in to view your Open Supply Hub Dashboard",
      })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

    const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_ADMIN_EMAIL!);
    await page
      .getByRole("textbox", { name: "Password" })
      .fill(USER_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "My Account" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    const moderationQueueLink = page.getByRole("link", {
      name: "Moderation Queue",
    });
    await expect(moderationQueueLink).toBeVisible();
    await moderationQueueLink.click();

    await expect(
      page
        .getByRole("heading", { name: "Dashboard / Moderation Queue" })
        .getByRole("link")
    ).toBeVisible();

    async function waitResponse() {
      const resp = await page.waitForResponse((resp) =>
        resp.url().includes("/api/v1/moderation-events/")
      );

      expect(resp.status()).toBe(200);
    }
    await waitResponse();

    async function chooseFilterOption(name: string, value: string) {
      const dropdown = page
        .locator(`label:has-text("${name}") + div div`)
        .filter({ hasText: "Select" })
        .nth(1);
      await dropdown.click();

      const input = dropdown.locator("input");
      await input.fill(value);

      const option = page
        .locator(`label:has-text("${name}") + div div`)
        .filter({ hasText: value })
        .nth(1);
      await option.click();
      await page.keyboard.press("Enter");
    }

    async function getColumnValues(columnNumber: number): Promise<string[]> {
      const cells = await page.locator(
        `table tbody tr td:nth-child(${columnNumber})`
      );
      const values: string[] = [];

      for (const cell of await cells.all()) {
        const text = (await cell.textContent()) as string;
        values.push(text);
      }

      return values;
    }

    async function clearFilterOption(name: string, value: string) {
      const locator = await page.locator(
        `label:has-text("${name}") + div div:has-text("${value}") + .select__multi-value__remove`
      );
      await locator.click();
    }

    await chooseFilterOption("Moderation Status", "APPROVED");
    await waitResponse();

    const statusValues = await getColumnValues(6);

    expect(statusValues).toContain("APPROVED");
    expect(statusValues).not.toContain("REJECTED");
    expect(statusValues).not.toContain("PENDING");
    expect(statusValues).toHaveLength(25);

    await clearFilterOption("Moderation Status", "APPROVED");
    await waitResponse();

    await chooseFilterOption("Data Source", "API");
    await waitResponse();
    const sourceValues = await getColumnValues(5);

    expect(sourceValues).toContain("API");
    expect(sourceValues).not.toContain("SLC");
    expect(sourceValues).toHaveLength(25);

    await clearFilterOption("Data Source", "API");
    await waitResponse();

    await chooseFilterOption("Country", "Türkiye");
    await waitResponse();
    const countryValues = await getColumnValues(3);

    expect(countryValues).toContain("Türkiye");
    expect(countryValues).toHaveLength(25);
    expect(countryValues.every((value) => value === "Türkiye")).toBe(true);

    await clearFilterOption("Country", "Türkiye");
    await waitResponse();

    const beforeDateInput = await page.locator("#before-date");
    beforeDateInput.fill("2025-04-30");
    await page.keyboard.press("Enter");
    await waitResponse();

    const afterDateInput = await page.locator("#after-date");
    afterDateInput.fill("2025-04-01");
    await page.keyboard.press("Enter");
    await waitResponse();

    const dateValues = await getColumnValues(1);
    expect(dateValues).toHaveLength(25);
    expect(dateValues.every((value) => value.indexOf("April") === 0)).toBe(
      true
    );

    const pageSizeButton = await page.getByRole("button", { name: "25" });
    await pageSizeButton.waitFor({ state: "visible" });
    await pageSizeButton.scrollIntoViewIfNeeded();
    await expect(page.locator("table tbody tr")).toHaveCount(25);
    pageSizeButton.click();

    const pageSize50 = await page.getByRole("option", { name: "50" });
    await pageSize50.waitFor({ state: "visible" });
    await pageSize50.click();
    await waitResponse();
    await expect(page.locator("table tbody tr")).toHaveCount(50);

    const downloadButton = page.locator("button[aria-label='Download Excel']");
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();
    downloadButton.click();

    const downloadEvent = await page.waitForEvent("download");
    const downloadPath = path.resolve(__dirname, "downloads");
    const filePath = path.join(downloadPath, downloadEvent.suggestedFilename());

    await downloadEvent.saveAs(filePath);
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);

    const fileName = path.basename(filePath);
    expect(fileName).toBe("moderation_events.xlsx");

    const moderationEvent = page.locator("table tbody tr:first-child");

    await expect(moderationEvent).toBeVisible();
    await expect(moderationEvent).toBeEnabled();
    await moderationEvent.click();
    const newPage = await page.context().waitForEvent("page");

    await newPage.waitForLoadState("load");
    expect(newPage.url()).toContain("/dashboard/moderation-queue/");
    await expect(
      newPage.getByRole("heading", {
        name: "Dashboard / Moderation Queue / Contribution Record",
      })
    ).toBeVisible();
  });

  test("A regular user does not have an access to the Moderation Queue page.", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    await page.goto(`${BASE_URL}/dashboard/moderation-queue/`!);
    await page.waitForLoadState("networkidle");

    // make sure that we can not open the Moderation queue page of Dashboard without authorization
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await page
      .getByRole("link", {
        name: "Sign in to view your Open Supply Hub Dashboard",
      })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    // fill in login with regular user credentials
    const { USER_EMAIL, USER_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_EMAIL!);
    await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();
    const resp = await page.waitForResponse(async (resp) =>
      resp.url().includes("/user-login/")
    );
    expect(resp.status()).toBe(200);

    await page.goto(`${BASE_URL}/dashboard/moderation-queue/`);
    await expect(
      page.getByRole("heading", { name: "Not found" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Dashboard / Moderation Queue" })
        .getByRole("link")
    ).not.toBeVisible();
  });
});
