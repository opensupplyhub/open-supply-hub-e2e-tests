import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminPage extends BasePage {
  // Locators
  private contributorTable = () => this.page.locator("table#result_list tbody tr");
  private firstRowLink = () => this.contributorTable().first().locator("th.field-__str__ a");
  private firstRowLinkDownloadLimit = () => this.page.locator("table#result_list tbody tr:first-child th a");
  private freeDownloadRecordsInput = () => this.page.locator("#id_free_download_records");
  private searchInput = () => this.page.getByRole("textbox", { name: "Search" });
  private searchButton = () => this.page.getByRole("button", { name: "Search" });
  private changeContributorHeading = () => this.page.getByText("Change contributor");
  private changeDownloadLimitHeading = () => this.page.getByText("Change facility download limit");
  private adminInput = () => this.page.locator("#id_admin");
  private embedConfigInput = () => this.page.locator("#id_embed_config");
  private embedLevelInput = () => this.page.locator("#id_embed_level");
  private saveButton = () => this.page.locator("input[type='submit'][value='Save']");
  private successMessageForContributor = () => this.page.getByText("The contributor").and(this.page.getByText("was changed successfully."));
  private successMessageForDownloadLimit = () => this.page.getByText("The facility download limit").and(this.page.getByText("was changed successfully."));

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async gotoContributors() {
    await this.goto("/admin/api/contributor/");
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

  async expectChangeDownloadLimitHeading() {
    await this.expectToBeVisible(this.changeDownloadLimitHeading());
  }

  async expectAdminEmail(email: string) {
    const selectedOption = this.adminInput().locator("option:checked");
    await this.expectToHaveText(selectedOption, email);
  }

  async clearEmbedConfiguration() {
    await this.embedConfigInput().selectOption("");
    await this.embedLevelInput().selectOption("");
    
    // Verify clearing
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

  async expectSuccessMessageForDownloadLimit() {
    await this.expectToBeVisible(this.successMessageForDownloadLimit());
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

  async gotoDownloadLimits() {
    await this.goto("/admin/api/facilitydownloadlimit/");
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

  async setFreeDownloadRecords(value: string) {
    await this.freeDownloadRecordsInput().fill(value);
    await this.saveButton().click();
    await this.waitForLoadState();
  }
} 