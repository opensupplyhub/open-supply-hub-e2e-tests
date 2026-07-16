import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export interface NewLocationData {
  name: string;
  address: string;
  country: string;
}

const SLC_INFO_PAGE_URL =
  /\/contribute\/single-location(?:\/[^/]+)?\/info\/[0-9a-f-]+/i;

function extractModerationIdFromUrl(url: string): string {
  const match = url.match(
    /\/contribute\/single-location(?:\/[^/]+)?\/info\/([0-9a-f-]+)/i,
  );
  return match?.[1] ?? "";
}

export class SingleLocationContributionPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToNameAddressTab() {
    await this.page.goto(
      `${this.baseUrl}/contribute/single-location?tab=name-address`,
    );
    await this.waitForLoadState("networkidle");
    await this.acceptCookiesIfPresent();
  }

  async ensureLoggedInAsRegularUser(email: string, password: string) {
    const acceptCookies = this.page.getByRole("button", { name: /^accept$/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }

    const loginLink = this.page.getByRole("link", {
      name: "Log in to contribute to Open Supply Hub",
    });

    if (await loginLink.isVisible().catch(() => false)) {
      await loginLink.click();
      await expect(
        this.page.getByRole("heading", { name: "Log In" }),
      ).toBeVisible();
      await this.page.getByLabel("Email").fill(email);
      await this.page.getByRole("textbox", { name: "Password" }).fill(password);
      await this.page.getByRole("button", { name: "Log In" }).click();
      await this.waitForLoadState("networkidle");
    }

    await expect(this.page.getByRole("button", { name: "My Account" })).toBeVisible();
  }

  async goToNewLocationForm() {
    await this.page.goto(`${this.baseUrl}/contribute/single-location/info/`);
    await this.waitForLoadState("networkidle");
    await expect(
      this.page.getByRole("heading", { name: "Production Location Information" }),
    ).toBeVisible();
  }

  private async selectCountry(countryName: string) {
    await this.page.evaluate(() => window.scrollTo(0, 400));
    await this.page.waitForLoadState("networkidle");

    const hiddenCountryInput = this.page.locator('input[name="country"]');

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.locator("#country").scrollIntoViewIfNeeded();
      await this.page.locator("#country .select__control").click({ force: true });

      const clearButton = this.page.locator("#country .select__clear-indicator");
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click({ force: true });
      }

      const input = this.page.locator("#country input").first();
      await input.fill(countryName, { force: true });
      await input.press("ArrowDown");
      await input.press("Enter");

      if ((await hiddenCountryInput.inputValue()) !== "") {
        return;
      }

      await input.press("ArrowDown");
      const option = this.page
        .locator("[id^='react-select-2-option-']", { hasText: countryName })
        .first();
      if (await option.isVisible().catch(() => false)) {
        await option.click({ force: true });
      }

      if ((await hiddenCountryInput.inputValue()) !== "") {
        return;
      }

      await this.page.waitForTimeout(500);
    }

    await expect(hiddenCountryInput).not.toHaveValue("");
  }

  private async fillInfoForm(data: NewLocationData) {
    await this.page.locator("#name").fill(data.name);
    await this.page.locator("#address").fill(data.address);
    await this.page.locator("#address").blur();
    await this.selectCountry(data.country);
    await this.page.locator("#name").blur();
    await this.page.waitForLoadState("networkidle");
  }

  private async dismissSubmissionWarningsIfPresent() {
    const confirmButton = this.page.getByRole("button", { name: "Submit anyway" });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  async submitNewLocation(data: NewLocationData): Promise<string> {
    await this.goToNameAddressTab();

    await this.page.getByPlaceholder("Type a name").fill(data.name);
    await this.page.getByPlaceholder("Address").fill(data.address);
    await this.page.getByPlaceholder("Type a name").blur();
    await this.page.getByPlaceholder("Address").blur();
    await this.selectSearchCountry(data.country);

    await this.page.getByRole("button", { name: "Search" }).click();
    await this.page.waitForURL(/\/contribute\/single-location\/search\//);

    const addLocationButton = this.page.getByRole("button", {
      name: "Add a new Location",
    });
    const dontSeeLocationButton = this.page.getByRole("button", {
      name: "I don't see my Location",
    });

    if (await addLocationButton.isVisible().catch(() => false)) {
      await addLocationButton.click();
    } else if (await dontSeeLocationButton.isVisible().catch(() => false)) {
      await dontSeeLocationButton.click();
      await this.page
        .getByRole("button", { name: "Yes, add a new production location" })
        .click();
    } else {
      await this.goToNewLocationForm();
    }

    await this.page.waitForURL(/\/contribute\/single-location\/info\/?/);
    await expect(
      this.page.getByRole("heading", { name: "Production Location Information" }),
    ).toBeVisible();

    await this.fillInfoForm(data);

    const submitButton = this.page.getByRole("button", { name: "Submit" });
    await expect(submitButton).toBeEnabled({ timeout: 60000 });

    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/production-locations/") &&
        resp.request().method() === "POST",
    );

    await submitButton.click();
    await this.dismissSubmissionWarningsIfPresent();

    const response = await responsePromise;
    expect([201, 202]).toContain(response.status());

    await this.page.waitForURL(SLC_INFO_PAGE_URL, {
      timeout: 30000,
    });

    const moderationId = extractModerationIdFromUrl(this.page.url());
    expect(moderationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    return moderationId;
  }

  private async selectSearchCountry(countryName: string) {
    await this.page.evaluate(() => window.scrollTo(0, 300));
    await this.page.waitForLoadState("networkidle");

    const selectQuery = "#countries .select__control .select__value-container";
    await this.page.waitForSelector(selectQuery);
    await this.page.locator(selectQuery).click();

    if (countryName === "China") {
      await this.page.locator("#react-select-3-option-45").click({ force: true });
      return;
    }

    await this.page.locator("#countries input").first().fill(countryName);
    await this.page
      .locator("[id^='react-select-'][id$='-option-']", { hasText: countryName })
      .first()
      .click({ force: true });
  }

  async searchAndOpenLocationForUpdate(osId: string, timeoutMs = 120000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.page.goto(
        `${this.baseUrl}/contribute/single-location?tab=os-id`,
      );
      await this.page.waitForLoadState("domcontentloaded");

      await this.page.getByPlaceholder("Enter the OS ID").fill(osId);

      const responsePromise = this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/production-locations/") &&
          [200, 404].includes(resp.status()),
        { timeout: 30000 },
      );
      await this.page.getByRole("button", { name: "Search by ID" }).click();
      const response = await responsePromise;

      if (response.status() === 200) {
        const claimButton = this.page.getByRole("button", {
          name: "Yes, add data and claim",
        });
        const selectButton = this.page
          .locator(`h3:has-text("${osId}")`)
          .locator("..")
          .locator("..")
          .getByRole("button", { name: "Select" });

        if (await claimButton.isVisible().catch(() => false)) {
          await claimButton.click();
        } else if (await selectButton.isVisible().catch(() => false)) {
          await selectButton.click();
        } else {
          await this.page.waitForTimeout(5000);
          continue;
        }

        await expect(
          this.page.getByRole("heading", {
            name: "Production Location Information",
          }),
        ).toBeVisible();
        return;
      }

      await this.page.waitForTimeout(5000);
    }

    throw new Error(`Production location "${osId}" was not found for update`);
  }

  async searchAndOpenExistingLocationByName(
    name: string,
    address: string,
    country: string,
    timeoutMs = 120000,
  ) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.goToNameAddressTab();
      await this.page.getByPlaceholder("Type a name").fill(name);
      await this.page.getByPlaceholder("Address").fill(address);
      await this.selectSearchCountry(country);

      const responsePromise = this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/production-locations/") &&
          resp.status() === 200,
        { timeout: 30000 },
      );
      await this.page.getByRole("button", { name: "Search" }).click();
      await responsePromise;

      const selectButton = this.page
        .locator(`h3:has-text("${name}")`)
        .locator("..")
        .locator("..")
        .getByRole("button", { name: "Select" })
        .first();

      if (await selectButton.isVisible().catch(() => false)) {
        await selectButton.click();
        await expect(
          this.page.getByRole("heading", {
            name: "Production Location Information",
          }),
        ).toBeVisible();
        await expect(
          this.page.getByRole("button", { name: "Update" }),
        ).toBeVisible();
        return;
      }

      await this.page.waitForTimeout(5000);
    }

    throw new Error(`Production location "${name}" was not found for update`);
  }

  async submitLocationUpdate(
    updatedName: string,
  ): Promise<string> {
    await this.page.locator("#name").fill(updatedName);

    const updateButton = this.page.getByRole("button", { name: "Update" });
    await expect(updateButton).toBeEnabled();

    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/production-locations/") &&
        resp.request().method() === "PATCH",
    );

    await updateButton.click();
    await this.dismissSubmissionWarningsIfPresent();

    const response = await responsePromise;
    expect([200, 202]).toContain(response.status());

    await this.page.waitForURL(SLC_INFO_PAGE_URL, {
      timeout: 30000,
    });

    const moderationId = extractModerationIdFromUrl(this.page.url());
    expect(moderationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    return moderationId;
  }
}
