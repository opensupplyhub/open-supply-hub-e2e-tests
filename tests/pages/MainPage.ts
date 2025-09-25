import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MainPage extends BasePage {
  // Locators
  private searchInput = () => this.page.getByPlaceholder("e.g. ABC Textiles Limited");
  private findFacilitiesButton = () => this.page.getByRole("button", { name: "Find Facilities" });
  private searchButton = () => this.page.getByRole("button", { name: "Search" });
  private downloadButton = () => this.page.getByRole("button", { name: "Download" });
  private excelMenuItem = () => this.page.getByRole("menuitem", { name: "Excel" });
  private loginToDownloadHeading = () => this.page.getByRole("heading", { name: "Log In To Download" });
  private cancelButton = () => this.page.getByRole("button", { name: "CANCEL" });
  private registerButton = () => this.page.getByRole("button", { name: "REGISTER" });
  private loginButton = () => this.page.getByRole("button", { name: "LOG IN" });
  private noFacilitiesMessage = () => this.page.getByText("No facilities matching this");
  private contributorsText = () => this.page.getByText("# Contributors");
  private facilityLinks = () => this.page.locator('a[href*="/facilities/"]');
  private resultsText = () => this.page.getByText(/^\d+ results$/);

  // Filter dropdowns
  private countriesDropdown = () => this.page.locator("#COUNTRIES div").filter({ hasText: "Select" }).nth(1);
  private facilityTypeDropdown = () => this.page.locator("#FACILITY_TYPE div").filter({ hasText: "Select" }).first();
  private workersDropdown = () => this.page.locator("#NUMBER_OF_WORKERS div").filter({ hasText: "Select" }).first();

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goTo() {
    await super.goTo();
  }

  async verifyPageTitle() {
    const title = await this.page.title();
    expect(title).toBe("Open Supply Hub");
  }

  async searchFacilities(searchQuery: string) {
    await this.searchInput().click();
    await this.searchInput().fill(searchQuery);
    await this.findFacilitiesButton().click();
    await this.waitForLoadState();
  }

  async searchByOSID(osId: string) {
    await this.searchInput().fill(osId);
    await this.searchButton().first().click();
    await this.waitForLoadState();
  }

  async searchByCountry(countryName: string) {
    await this.countriesDropdown().click();
    const countryInput = this.countriesDropdown().locator("input");
    await countryInput.fill(countryName);
    const option = this.page.locator("#COUNTRIES div").filter({ hasText: countryName }).nth(1);
    await option.click();
    await this.page.keyboard.press("Enter");
  }

  async searchByFacilityType(facilityType: string) {
    await this.facilityTypeDropdown().click();
    const typeInput = this.facilityTypeDropdown().locator("input");
    await typeInput.fill(facilityType);
    const typeOption = this.page.locator("#FACILITY_TYPE div").filter({ hasText: facilityType }).first();
    await typeOption.click();
    await this.page.keyboard.press("Enter");
  }

  async searchByWorkerRange(workerRange: string) {
    await this.workersDropdown().click();
    const workersInput = this.workersDropdown().locator("input");
    await workersInput.fill(workerRange);
    const option = this.page.locator("#NUMBER_OF_WORKERS div").filter({ hasText: workerRange }).first();
    await option.click();
    await this.page.keyboard.press("Enter");
  }

  async performSearch() {
    const searchButton = this.page.locator('button[type="submit"]', { hasText: /search/i });
    await searchButton.waitFor({ state: "visible" });
    await searchButton.click();
    await this.waitForLoadState();
  }

  async clickFirstFacility() {
    const facilityLink = this.facilityLinks().first();
    await facilityLink.scrollIntoViewIfNeeded();
    await facilityLink.waitFor({ state: "visible" });
    await facilityLink.click();
    await this.waitForLoadState();
  }

  async downloadFacilitiesExcel() {
    await this.downloadButton().click({ force: true });
    await this.waitForLoadState();
    await this.excelMenuItem().click({ force: true });
  }

  async expectDownloadLoginPrompt() {
    await this.expectToBeVisible(this.loginToDownloadHeading());
    await this.expectToBeVisible(this.cancelButton());
    await this.expectToBeVisible(this.registerButton());
    await this.expectToBeVisible(this.loginButton());
  }

  async expectNoFacilitiesMessage() {
    await this.expectToBeVisible(this.noFacilitiesMessage());
  }

  async expectSearchResults() {
    await this.expectToBeVisible(this.contributorsText());
  }

  async expectFacilityInResults(facilityName: string) {
    await this.expectToBeVisible(this.page.getByText(facilityName).first());
  }

  async expectOSIDInResults(osId: string) {
    await this.expectToBeVisible(this.page.getByText(osId));
  }

  async expectCountryInResults(countryName: string) {
    await this.expectToBeVisible(this.page.getByText(countryName, { exact: true }));
  }

  async getResultsCount(): Promise<number> {
    const text = await this.resultsText().textContent();
    return parseInt(text?.match(/\d+/)?.[0] || "0", 10);
  }

  async getOSIDFromFacilityPage(): Promise<string> {
    const paragraph = this.page.locator("p", { hasText: "OS ID: " });
    await this.expectToBeVisible(paragraph);
    return (await paragraph.locator("span").textContent()) as string;
  }

  async goBackToSearchResults() {
    await this.page.getByRole("button", { name: "Back to search results" }).click();
  }
} 