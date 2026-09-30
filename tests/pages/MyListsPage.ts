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

  private listRow(listName: string) {
    return this.tableRows().filter({ hasText: listName }).first();
  }

  async expectListVisible(listName: string) {
    await expect(this.listRow(listName)).toBeVisible({ timeout: 60000 });
  }

  async openListByName(listName: string) {
    await this.listRow(listName).click({ force: true });
    await this.page.waitForURL(/\/lists\/\d+/);
  }

  async goToList(listId: number) {
    await this.goTo(`/lists/${listId}`);
    await this.acceptCookiesIfPresent();
  }

  async expectFirstRow(values: {
    name: string;
    description: string;
    fileName: string;
  }) {
    const row = this.tableRows().first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const headers = this.page.locator("table thead tr th");
    const columns = [
      { name: "Name", value: values.name },
      { name: "Description", value: values.description },
      { name: "File Name", value: values.fileName },
    ];
    for (const [index, column] of columns.entries()) {
      await expect(headers.nth(index)).toHaveText(column.name);
      await expect(row.locator("td").nth(index)).toHaveText(column.value);
    }
  }

  async expectListDetail(status: string) {
    await expect(this.page.getByRole("heading", { name: "List Status" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: status })).toBeVisible();
    await this.expectListDetailDownloads();
    await expect(this.page.getByRole("button", { name: /Back to lists/i })).toBeVisible();
  }

  async expectListHeading(listName: string) {
    await expect(
      this.page.getByRole("heading", { name: listName }),
    ).toBeVisible();
  }

  async filterItemsByStatus(status: string) {
    await this.page.locator(".select__value-container").click();
    await this.page.locator(`.select__option:has-text('${status}')`).click();
    await expect(this.page.locator(".select__multi-value__label")).toHaveText(
      new RegExp(status),
    );
    await this.waitForLoadState("networkidle");
  }

  async expectErrorRowCount(count: number) {
    await expect(this.tableRows()).toHaveCount(count);
  }

  async toggleErrorRow(index: number) {
    await this.page.evaluate(() => window.scrollBy(0, 100));
    await this.tableRows().nth(index).click({ force: true, timeout: 5000 });
  }

  async expectExpandedRowError(text: string) {
    await expect(this.page.getByText("Errors")).toBeVisible();
    await expect(this.page.getByText(text)).toBeVisible();
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
}
