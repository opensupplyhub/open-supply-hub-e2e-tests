import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ContributorListsPage extends BasePage {
  private tableRows = () => this.page.locator("table tbody tr");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToLists() {
    await this.page.goto(`${this.baseUrl}/dashboard/lists`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectListsPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Contributor Lists" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(this.page.url()).toContain("/dashboard/lists");
  }

  async expectTableVisible() {
    await expect(this.tableRows().first()).toBeVisible({ timeout: 30000 });
  }

  async expectRowsPresent() {
    await this.expectTableVisible();
    expect(await this.tableRows().count()).toBeGreaterThan(0);
  }

  async expectTableColumns() {
    for (const header of [
      "Date Created",
      "Name",
      "Description",
      "File Name",
      "Total",
      "Matched",
      "Error",
      "Potential Match",
      "Active",
    ]) {
      await expect(this.page.getByText(header, { exact: true }).first()).toBeVisible();
    }
  }

  async openListById(listId: number | string) {
    await this.page.goto(`${this.baseUrl}/lists/${listId}`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
    await expect(this.page).toHaveURL(new RegExp(`/lists/${listId}`));
  }

  async getHeaders(): Promise<string[]> {
    const headers = this.page.locator("table thead th, table thead td");
    const values: string[] = [];
    for (const header of await headers.all()) {
      const text = ((await header.textContent()) || "").trim();
      if (text) {
        values.push(text);
      }
    }
    return values;
  }

  async chooseListStatus(status: string) {
    const container = this.page.locator("#STATUS");
    await container.click();
    await this.page.getByText(status, { exact: true }).click();
    await this.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000);
  }

  async openFirstPendingListWithTotalGreaterThanZero(): Promise<string | null> {
    await this.chooseListStatus("Pending");
    await expect(this.tableRows().first()).toBeVisible({ timeout: 30000 });

    const rows = await this.tableRows().all();
    for (const row of rows) {
      const cells = row.locator("td");
      const totalText = ((await cells.nth(4).textContent()) || "").trim();
      const total = Number(totalText.replace(/,/g, ""));
      if (!Number.isNaN(total) && total > 0) {
        await row.click();
        await this.waitForLoadState("domcontentloaded");
        const match = this.page.url().match(/\/lists\/(\d+)/);
        return match?.[1] ?? null;
      }
    }
    return null;
  }

  async expectListDetailLoaded() {
    await expect(this.page.url()).toMatch(/\/lists\/\d+/);
    await expect(
      this.page.getByRole("button", { name: /download formatted file/i }),
    ).toBeVisible({ timeout: 30000 });
  }

  async isProcessingDialogVisible(): Promise<boolean> {
    return this.page
      .getByText(/Data has been successfully uploaded and is being processed/i)
      .isVisible()
      .catch(() => false);
  }

  async dismissProcessingDialogIfPresent() {
    if (!(await this.isProcessingDialogVisible())) {
      return;
    }
    const refresh = this.page.getByRole("button", { name: /^refresh$/i });
    if (await refresh.isVisible().catch(() => false)) {
      await refresh.click();
      await this.waitForLoadState("domcontentloaded");
    }
  }

  async rejectList(reason: string) {
    await this.page.getByRole("button", { name: /reject list/i }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const reasonField = dialog
      .locator("#dialog-text-field, input[type='text'], textarea")
      .first();
    await reasonField.fill(reason);
    await dialog.getByRole("button", { name: /^reject$/i }).click();
  }

  async approveList() {
    await this.page.getByRole("button", { name: /approve list/i }).click();
  }

  async expectListStatus(status: string) {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible({
      timeout: 60000,
    });
  }

  async backToLists() {
    await this.page.getByRole("button", { name: /back to lists/i }).click();
    await this.expectListsPage();
  }
}
