import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminPage extends BasePage {
  // Locators
  // Contributors
  private contributorTable = () => this.page.locator("table#result_list tbody tr");
  private firstRowLink = () => this.contributorTable().first().locator("th.field-__str__ a");
  private changeContributorHeading = () => this.page.getByText("Change contributor");
  private embedConfigInput = () => this.page.locator("#id_embed_config");
  private embedLevelInput = () => this.page.locator("#id_embed_level");
  private successMessageForContributor = () => this.page.getByText("The contributor").and(this.page.getByText("was changed successfully."));

  // Download limits
  private firstRowLinkDownloadLimit = () => this.page.locator("table#result_list tbody tr:first-child th a");
  private freeDownloadRecordsInput = () => this.page.locator("#id_free_download_records");
  private changeDownloadLimitHeading = () => this.page.getByText("Change facility download limit");
  private successMessageForDownloadLimit = () => this.page.getByText("The facility download limit").and(this.page.getByText("was changed successfully."));

  // Common
  private searchInput = () => this.page.getByRole("textbox", { name: "Search" });
  private searchButton = () => this.page.getByRole("button", { name: "Search" });
  private adminInput = () => this.page.locator("#id_admin");
  private saveButton = () => this.page.locator("input[type='submit'][value='Save']");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToContributors() {
    await this.goTo("/admin/api/contributor/");
  }

  async searchContributor(email: string) {
    await this.searchInput().fill(email);
    await this.searchButton().click();
    await this.waitForLoadState();
  }

  async clickFirstContributor() {
    await this.firstRowLink().click();
    await this.waitForLoadState();
  }

  async expectChangeContributorPage() {
    await this.expectToBeVisible(this.changeContributorHeading());
  }

  async expectAdminEmail(email: string) {
    const selectedOption = this.adminInput().locator("option:checked");
    await this.expectToHaveText(selectedOption, email);
  }

  async clearEmbedConfiguration() {
    await this.embedConfigInput().selectOption("");
    await this.embedLevelInput().selectOption("");
    
    await this.expectToHaveText(this.embedConfigInput().locator("option:checked"), "---------");
    await this.expectToHaveText(this.embedLevelInput().locator("option:checked"), "---------");
  }

  async setEmbedLevel(level: string) {
    await this.embedLevelInput().selectOption(level);
  }

  async setEmbedLevelToDeluxe() {
    await this.setEmbedLevel("3");
    await this.expectToHaveText(
      this.embedLevelInput().locator("option:checked"),
      "Embed Deluxe / Custom Embed"
    );
  }

  async saveChanges() {
    await this.saveButton().click();
    await this.waitForLoadState();
  }

  async expectSuccessMessageForContributor() {
    await this.expectToBeVisible(this.successMessageForContributor());
  }

  async expectEmbedConfigCreated() {
    const configInput = this.embedConfigInput();  
    const selectedValue = await configInput.locator("option:checked").textContent();

    expect(selectedValue).not.toBe("");
    expect(selectedValue).toContain("100% x 100");
  }

  async getEmbedConfigValue(): Promise<string> {
    return await this.embedConfigInput().locator("option:checked").textContent() || "";
  }

  async expectSelectContributorPage() {
    await this.expectToBeVisible(this.page.getByText("Select contributor to change"));
  }

  async goToDownloadLimits() {
    await this.goTo("/admin/api/facilitydownloadlimit/");
  }

  async expectDownloadLimitsPage() {
    await this.expectToBeVisible(this.page.getByText("Select facility download limit to change"));
  }

  async searchUserDownloadLimit(email: string) {
    await this.searchInput().fill(email);
    await this.searchButton().click();
    await this.waitForLoadState();
  }

  async clickFirstRowLinkDownloadLimit() {
    await this.firstRowLinkDownloadLimit().click();
    await this.waitForLoadState();
  }

  async expectChangeDownloadLimitHeading() {
    await this.expectToBeVisible(this.changeDownloadLimitHeading());
  }

  async setFreeDownloadRecords(value: string) {
    await this.freeDownloadRecordsInput().fill(value);
    await this.saveButton().click();
    await this.waitForLoadState();
  }

  async expectSuccessMessageForDownloadLimit() {
    await this.expectToBeVisible(this.successMessageForDownloadLimit());
  }
} 