import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { LoginPage } from "./LoginPage";

export interface NewLocationData {
  name: string;
  address: string;
  country: string;
}

const SLC_INFO_PAGE_URL =
  /\/contribute\/single-location(?:\/[^/]+)?\/info\/[0-9a-f-]+/i;
const MODERATION_ID_FROM_URL =
  /\/contribute\/single-location(?:\/[^/]+)?\/info\/([0-9a-f-]+)/i;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SingleLocationContributionPage extends BasePage {
  private searchHeading = () =>
    this.page.getByRole("heading", { name: "Production Location Search" });
  private infoHeading = () =>
    this.page.getByRole("heading", { name: "Production Location Information" });
  private nameSearchInput = () => this.page.getByPlaceholder("Type a name");
  private addressSearchInput = () => this.page.getByPlaceholder("Address");
  private searchButton = () => this.page.getByRole("button", { name: "Search" });
  private searchCountrySelect = () => this.page.locator("#countries");
  private addLocationButton = () =>
    this.page.getByRole("button", { name: "Add a new Location" });
  private dontSeeLocationButton = () =>
    this.page.getByRole("button", { name: "I don't see my Location" });
  private confirmAddLocationButton = () =>
    this.page.getByRole("button", {
      name: "Yes, add a new production location",
    });
  private nameInput = () => this.page.locator("#name");
  private addressInput = () => this.page.locator("#address");
  private countrySelect = () => this.page.locator("#country");
  private countryValueInput = () => this.page.locator('input[name="country"]');
  private contributeLoginLink = () =>
    this.page.getByRole("link", {
      name: "Log in to contribute to Open Supply Hub",
    });
  private submitAnywayButton = () =>
    this.page.getByRole("button", { name: "Submit anyway" });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToNameAddressTab() {
    await this.goTo("/contribute/single-location?tab=name-address");
    await this.acceptCookiesIfPresent();
    await this.expectToBeVisible(this.searchHeading());
  }

  async ensureLoggedInAsRegularUser(email: string, password: string) {
    await this.acceptCookiesIfPresent();
    const loginPage = new LoginPage(this.page, this.baseUrl);
    if (await this.contributeLoginLink().isVisible().catch(() => false)) {
      await loginPage.loginFromContributeLink(email, password);
    }
    await loginPage.expectSignedIn();
  }

  async goToNewLocationForm() {
    await this.goTo("/contribute/single-location/info/");
    await this.acceptCookiesIfPresent();
    await this.expectInfoForm();
  }

  async fillNameAddressSearch(name: string, address: string, country: string) {
    await this.nameSearchInput().fill(name);
    await this.addressSearchInput().fill(address);
    await this.chooseSelectOption(this.searchCountrySelect(), country);
  }

  async searchByNameAndAddress(name: string, address: string, country: string) {
    await this.fillNameAddressSearch(name, address, country);
    await this.searchButton().click();
  }

  async submitNewLocation(data: NewLocationData): Promise<string> {
    await this.goToNameAddressTab();
    await this.searchByNameAndAddress(data.name, data.address, data.country);
    await this.page.waitForURL(/\/contribute\/single-location\/search\//);
    await this.openNewLocationFormFromSearch();
    await this.fillInfoForm(data);
    await this.submitFormAndWaitForSuccess("Submit", "POST", [201, 202]);
    await this.page.waitForURL(SLC_INFO_PAGE_URL, { timeout: 30000 });

    const moderationId =
      this.page.url().match(MODERATION_ID_FROM_URL)?.[1] ?? "";
    expect(moderationId).toMatch(UUID);
    return moderationId;
  }

  private async openNewLocationFormFromSearch() {
    if (await this.addLocationButton().isVisible().catch(() => false)) {
      await this.addLocationButton().click();
    } else if (await this.dontSeeLocationButton().isVisible().catch(() => false)) {
      await this.dontSeeLocationButton().click();
      await this.confirmAddLocationButton().click();
    } else {
      await this.goToNewLocationForm();
    }

    await this.page.waitForURL(/\/contribute\/single-location\/info\/?/);
    await this.expectInfoForm();
  }

  private async expectInfoForm() {
    await this.expectToBeVisible(this.infoHeading());
  }

  private async fillInfoForm(data: NewLocationData) {
    await this.nameInput().fill(data.name);
    await this.addressInput().fill(data.address);
    await this.addressInput().blur();
    await this.selectCountry(data.country);
    await this.nameInput().blur();
  }

  private async selectCountry(countryName: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.chooseSelectOption(this.countrySelect(), countryName);
      if ((await this.countryValueInput().inputValue()) !== "") {
        return;
      }
    }
    await expect(this.countryValueInput()).not.toHaveValue("");
  }

  private async waitForCountriesList() {
    const pending = this.page.waitForResponse(
      (resp) => resp.url().includes("/api/countries/") && resp.ok(),
      { timeout: 20000 },
    );
    const alreadyLoaded = await this.page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.includes("/api/countries/")),
    );
    if (alreadyLoaded) {
      pending.catch(() => undefined);
      return;
    }
    await pending;
  }

  private async openSelectMenu(container: Locator) {
    const input = container.locator("input[id^='react-select-']").first();
    await container.scrollIntoViewIfNeeded();
    await this.page.evaluate(() => window.scrollBy(0, -160));
    await input.focus({ force: true });
    await input.press("ArrowDown", { force: true });

    const menu = this.page.locator(".select__menu").first();
    if (await menu.isVisible().catch(() => false)) {
      return;
    }

    await container.locator(".select__control").click({ force: true });
    await input.press("ArrowDown", { force: true });
  }

  private async chooseSelectOption(container: Locator, optionText: string) {
    await this.acceptCookiesIfPresent();
    await this.waitForCountriesList();
    await this.openSelectMenu(container);

    await expect(this.page.locator(".select__menu").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(this.page.locator(".select__option").first()).toBeVisible({
      timeout: 15000,
    });

    await this.page.keyboard.type(optionText, { delay: 40 });
    const option = this.page
      .locator(".select__option")
      .filter({ hasText: new RegExp(`^${optionText}$`) })
      .first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await this.page.keyboard.press("Enter");
    if (await container.locator(".select__single-value").isVisible().catch(() => false)) {
      return;
    }
    await option.click({ force: true });
  }

  private async submitFormAndWaitForSuccess(
    buttonName: "Submit" | "Update",
    method: "POST" | "PATCH",
    successStatuses: number[],
  ) {
    const submitButton = this.page.getByRole("button", { name: buttonName });
    await expect(submitButton).toBeEnabled({ timeout: 60000 });

    const successResponsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/production-locations/") &&
        resp.request().method() === method &&
        successStatuses.includes(resp.status()),
      { timeout: 45000 },
    );

    await submitButton.click();
    await Promise.race([
      successResponsePromise,
      this.submitAnywayButton()
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => this.submitAnywayButton().click())
        .catch(() => undefined),
    ]);

    const response = await successResponsePromise;
    expect(successStatuses).toContain(response.status());
    return response;
  }
}
