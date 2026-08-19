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

  async setUserFreeDownloadQuota(userEmail: string, freeRecords: string) {
    await this.goToDownloadLimits();
    await this.searchUserDownloadLimit(userEmail);
    await this.clickFirstRowLinkDownloadLimit();
    await this.setFreeDownloadRecords(freeRecords);
  }

  async expectSuccessMessageForDownloadLimit() {
    await this.expectToBeVisible(this.successMessageForDownloadLimit());
  }

  async goToWaffleSwitches() {
    await this.goTo("/admin/waffle/switch/");
    await this.expectToBeVisible(this.page.getByText("Select switch to change"));
  }

  async openWaffleSwitchChangeForm(switchName: string) {
    await this.goToWaffleSwitches();
    await this.searchInput().fill(switchName);
    await this.searchButton().click();
    await this.waitForLoadState();

    const row = this.page.locator("table#result_list tbody tr").filter({ hasText: switchName });
    await expect(row).toHaveCount(1);
    await row.locator("a").first().click();
    await this.waitForLoadState();
    await this.expectToBeVisible(this.page.locator("#id_active"));
  }

  async setWaffleSwitchActive(switchName: string, active: boolean) {
    await this.openWaffleSwitchChangeForm(switchName);

    const activeCheckbox = this.page.locator("#id_active");
    const isChecked = await activeCheckbox.isChecked();
    if (isChecked !== active) {
      if (active) {
        await activeCheckbox.check();
      } else {
        await activeCheckbox.uncheck();
      }
      await this.saveChanges();
      await this.expectToBeVisible(
        this.page.getByText("The switch").and(this.page.getByText("was changed successfully."))
      );
    }

    await this.openWaffleSwitchChangeForm(switchName);
    await expect(activeCheckbox).toBeChecked({ checked: active });
  }

  async goToSources(listOnly = false) {
    const path = listOnly
      ? "/admin/api/source/?source_type__exact=LIST"
      : "/admin/api/source/";
    await this.goTo(path);
    await this.waitForLoadState();
  }

  async filterSourcesByListType() {
    const listFilter = this.page.locator("#changelist-filter a", {
      hasText: "LIST",
    });
    if (await listFilter.isVisible().catch(() => false)) {
      await listFilter.click();
      await this.waitForLoadState();
    }
  }

  async openFirstSource() {
    const link = this.page.locator("#result_list tbody tr th a").first();
    await expect(link).toBeVisible({ timeout: 20000 });
    await link.click();
    await this.waitForLoadState();
  }

  async setSourceIsActive(active: boolean) {
    const checkbox = this.page.locator("#id_is_active");
    await expect(checkbox).toBeVisible();
    const isChecked = await checkbox.isChecked();
    if (isChecked !== active) {
      if (active) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
  }

  async expectSourceIsActive(active: boolean) {
    await expect(this.page.locator("#id_is_active")).toBeChecked({
      checked: active,
    });
  }

  async changeSourceContributorBySearch(searchText: string) {
    const contributor = this.page.locator("#id_contributor");
    await expect(contributor).toBeVisible();

    const currentValue = await contributor.inputValue().catch(() => "");
    const select2 = this.page.locator(".select2-selection").first();
    if (await select2.isVisible().catch(() => false)) {
      await select2.click();
      const search = this.page.locator(".select2-search__field");
      await search.fill(searchText);
      await this.page.waitForTimeout(1500);
      const options = this.page.locator(
        ".select2-results__option:not(.select2-results__option--load-more):not(.select2-results__message)",
      );
      await expect(options.first()).toBeVisible({ timeout: 15000 });
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const option = options.nth(i);
        const text = ((await option.textContent()) || "").trim();
        const optionId = (await option.getAttribute("id")) || "";
        if (!text || /loading|no results/i.test(text)) {
          continue;
        }
        // Prefer an option different from the current selection when possible
        if (currentValue && optionId.includes(`-${currentValue}-`)) {
          continue;
        }
        await option.click();
        return;
      }
      await options.first().click();
      return;
    }

    const options = await contributor.locator("option").all();
    for (const option of options) {
      const label = ((await option.textContent()) || "").trim();
      const value = (await option.getAttribute("value")) || "";
      if (
        label &&
        label.toLowerCase().includes(searchText.toLowerCase()) &&
        value &&
        value !== currentValue
      ) {
        await contributor.selectOption(value);
        return;
      }
    }
    await contributor.selectOption({ label: searchText });
  }

  async getSourceChangeUrl(): Promise<string> {
    return this.page.url();
  }
} 