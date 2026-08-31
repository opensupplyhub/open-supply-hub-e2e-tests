import { Download, Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MyListsPage extends BasePage {
  private heading = () => this.page.getByRole("heading", { name: "My Lists" });
  private tableRows = () => this.page.locator("table tbody tr");
  private emptyMessage = () =>
    this.page.getByText(
      "You currently have no lists to view. Please contribute a list of factories to OS Hub first.",
    );
  private contributeLink = () =>
    this.page.getByRole("main").getByRole("link", { name: "Contribute", exact: true });
  private downloadFormatted = () =>
    this.page.getByRole("button", { name: /download formatted file/i });
  private downloadSubmitted = () =>
    this.page.getByRole("link", { name: /download submitted file/i });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToMyLists() {
    await this.goTo("/lists");
    await this.acceptCookiesIfPresent();
  }

  async expectMyLists() {
    await expect(this.page).toHaveURL(/\/lists/);
    await this.expectToBeVisible(this.heading());
  }

  async expectEmptyState() {
    await this.expectMyLists();
    await expect(this.tableRows()).toHaveCount(0);
    await this.expectToBeVisible(this.emptyMessage());
    await expect(this.contributeLink()).toBeVisible();
    await expect(this.contributeLink()).toHaveAttribute("href", "/contribute");
  }

  async openContributeFromEmptyState() {
    await this.contributeLink().click();
    await this.page.waitForURL(/\/contribute\/?$/);
  }

  async expectListVisible(listName: string) {
    await expect(
      this.page.locator("table tbody tr").filter({ hasText: listName }).first(),
    ).toBeVisible({ timeout: 60000 });
  }

  async openListByName(listName: string) {
    await this.page
      .locator("table tbody tr")
      .filter({ hasText: listName })
      .first()
      .click({ force: true });
    await this.page.waitForURL(/\/lists\/\d+/);
  }

  async expectListDetailDownloads() {
    await expect(this.downloadFormatted()).toBeVisible({ timeout: 30000 });
    await expect(this.downloadSubmitted()).toBeVisible();
  }

  async downloadFormattedFile(): Promise<Download> {
    const download = this.page.waitForEvent("download", { timeout: 60000 });
    await this.downloadFormatted().click();
    return download;
  }

  async downloadSubmittedFile(): Promise<Download> {
    const download = this.page.waitForEvent("download", { timeout: 60000 });
    await this.downloadSubmitted().click();
    return download;
  }

  async expectRowsPresent() {
    await expect(this.tableRows().first()).toBeVisible({ timeout: 30000 });
  }
}
