import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export const MODERATION_QUEUE_COLUMNS = {
  CREATED_DATE: 1,
  LOCATION_NAME: 2,
  COUNTRY: 3,
  CONTRIBUTOR: 4,
  SOURCE: 5,
  STATUS: 6,
  DECISION_DATE: 7,
  LAST_UPDATED: 8,
} as const;

export class ModerationQueuePage extends BasePage {
  private tableRows = () => this.page.locator("table tbody tr");
  private downloadButton = () =>
    this.page.locator("button[aria-label='Download Excel']");
  private beforeDateInput = () => this.page.locator("#before-date");
  private afterDateInput = () => this.page.locator("#after-date");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToModerationQueue() {
    await this.page.goto(`${this.baseUrl}/dashboard/moderation-queue`);
    await this.waitForLoadState("networkidle");
  }

  async expectModerationQueuePage() {
    await this.expectModerationQueueHeading();
    expect(this.page.url()).toContain("/dashboard/moderation-queue");
  }

  async expectModerationQueueHeading() {
    const heading = this.page.getByRole("heading", {
      name: "Dashboard / Moderation Queue",
    });
    await heading.waitFor({ state: "visible", timeout: 15000 });
    await expect(heading).toBeVisible();
  }

  async waitForModerationEventsResponse() {
    const emptyMessage = this.page.getByText(
      /no moderation events|no results|no data/i,
    );
    const firstRow = this.tableRows().first();

    if (await firstRow.isVisible().catch(() => false)) {
      return;
    }

    await Promise.race([
      firstRow.waitFor({ state: "visible", timeout: 30000 }),
      emptyMessage.waitFor({ state: "visible", timeout: 30000 }),
    ]).catch(() => undefined);

    if (await firstRow.isVisible().catch(() => false)) {
      return;
    }
    if (await emptyMessage.isVisible().catch(() => false)) {
      return;
    }

    await expect(firstRow).toBeVisible({ timeout: 5000 });
  }

  private waitForNextEventsGet() {
    return this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/moderation-events/") &&
        resp.request().method() === "GET",
      { timeout: 30000 },
    );
  }

  private filterDropdown(filterLabel: string): Locator {
    return this.page
      .locator(`label:has-text("${filterLabel}") + div div`)
      .filter({ hasText: "Select" })
      .nth(1);
  }

  async chooseFilterOption(filterLabel: string, value: string) {
    const dropdown = this.filterDropdown(filterLabel);
    await dropdown.click();

    const input = dropdown.locator("input");
    await input.fill(value);

    const option = this.page
      .locator(`label:has-text("${filterLabel}") + div div`)
      .filter({ hasText: value })
      .nth(1);
    const eventsResponse = this.waitForNextEventsGet();
    await option.click();
    await this.page.keyboard.press("Enter");
    await eventsResponse.catch(() => undefined);
  }

  async clearFilterOption(filterLabel: string, value: string) {
    const removeButton = this.page.locator(
      `label:has-text("${filterLabel}") + div div:has-text("${value}") + .select__multi-value__remove`,
    );
    await removeButton.click();
    await this.waitForLoadState("networkidle");
  }

  async getColumnValues(columnNumber: number): Promise<string[]> {
    const cells = this.page.locator(
      `table tbody tr td:nth-child(${columnNumber})`,
    );
    const values: string[] = [];

    for (const cell of await cells.all()) {
      values.push(((await cell.textContent()) || "").trim());
    }

    return values;
  }

  async expectRowCount(expectedCount: number) {
    await expect(this.tableRows()).toHaveCount(expectedCount);
  }

  async expectRowCountBetween(min: number, max: number) {
    const count = await this.tableRows().count();
    expect(count).toBeGreaterThanOrEqual(min);
    expect(count).toBeLessThanOrEqual(max);
  }

  async setPageSize(size: 25 | 50 | 100) {
    const currentSize = await this.getCurrentPageSize();
    if (currentSize === size) {
      return;
    }

    const pageSizeButton = this.page.getByRole("button", {
      name: String(currentSize),
      exact: true,
    });
    await pageSizeButton.waitFor({ state: "visible" });
    await pageSizeButton.scrollIntoViewIfNeeded();
    await pageSizeButton.click();

    const option = this.page.getByRole("option", { name: String(size) });
    await option.waitFor({ state: "visible" });
    const eventsResponse = this.waitForNextEventsGet();
    await option.click();
    await eventsResponse.catch(() => undefined);
  }

  async getCurrentPageSize(): Promise<number> {
    for (const size of [25, 50, 100] as const) {
      const button = this.page.getByRole("button", {
        name: String(size),
        exact: true,
      });
      if ((await button.count()) > 0) {
        return size;
      }
    }

    return 25;
  }

  async setDateRange(afterDate: string, beforeDate: string) {
    const beforeResponse = this.waitForNextEventsGet();
    await this.beforeDateInput().fill(beforeDate);
    await this.page.keyboard.press("Enter");
    await beforeResponse.catch(() => undefined);

    const afterResponse = this.waitForNextEventsGet();
    await this.afterDateInput().fill(afterDate);
    await this.page.keyboard.press("Enter");
    await afterResponse.catch(() => undefined);
  }

  async clearDateFilters() {
    await this.beforeDateInput().fill("");
    await this.page.keyboard.press("Enter");
    await this.afterDateInput().fill("");
    await this.page.keyboard.press("Enter");
    await this.waitForModerationEventsResponse();
  }

  async sortByColumn(columnLabel: string) {
    const eventsResponse = this.waitForNextEventsGet();
    await this.page.getByRole("button", { name: `${columnLabel} sort` }).click();
    await eventsResponse.catch(() => undefined);
  }

  async getActiveSortColumn(): Promise<string | null> {
    const activeSort = this.page.locator(
      'thead [aria-sort="ascending"], thead [aria-sort="descending"]',
    );
    if ((await activeSort.count()) === 0) {
      return null;
    }
    return ((await activeSort.first().textContent()) || "").trim();
  }

  async getSortDirection(columnLabel: string): Promise<"ascending" | "descending" | null> {
    const sortLabel = this.page.getByRole("button", { name: `${columnLabel} sort` });
    const className = (await sortLabel.getAttribute("class")) || "";
    if (className.includes("iconDirectionDesc")) {
      return "descending";
    }
    if (className.includes("iconDirectionAsc")) {
      return "ascending";
    }

    const ariaSort = await sortLabel.getAttribute("aria-sort");
    if (ariaSort === "ascending" || ariaSort === "descending") {
      return ariaSort;
    }

    return null;
  }

  async downloadExcel() {
    await expect(this.downloadButton()).toBeVisible();
    await expect(this.downloadButton()).toBeEnabled();

    const downloadPromise = this.page.waitForEvent("download");
    await this.downloadButton().click();
    return downloadPromise;
  }

  async openFirstContributionRecord() {
    return this.openContributionRecord(this.tableRows().first());
  }

  async openContributionRecord(row: Locator) {
    await expect(row).toBeVisible();
    await expect(row).toBeEnabled();

    const pagePromise = this.page.context()
      .waitForEvent("page", { timeout: 10000 })
      .catch(() => null);
    await row.click();
    const popup = await pagePromise;
    if (popup && !popup.isClosed()) {
      await popup.waitForLoadState("domcontentloaded");
      return popup;
    }

    await this.page.waitForURL(/\/dashboard\/moderation-queue\/[0-9a-f-]+/i, {
      timeout: 15000,
    });
    return this.page;
  }

  async getCountryFilterOptions(): Promise<string[]> {
    const dropdown = this.filterDropdown("Country Name");
    await dropdown.click();
    await this.page.waitForTimeout(500);

    const options = this.page.locator("[class*='menu'] [class*='option']");
    const labels: string[] = [];
    for (const option of await options.all()) {
      const text = ((await option.textContent()) || "").trim();
      if (text) {
        labels.push(text);
      }
    }

    await this.page.keyboard.press("Escape");
    return labels;
  }

  async waitForLocationInQueue(locationName: string, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.goToModerationQueue();
      await this.chooseFilterOption("Moderation Status", "PENDING");
      await this.waitForModerationEventsResponse();

      const names = await this.getColumnValues(
        MODERATION_QUEUE_COLUMNS.LOCATION_NAME,
      );
      if (names.some((name) => name.includes(locationName))) {
        return;
      }

      await this.page.waitForTimeout(2000);
    }

    throw new Error(`Location "${locationName}" did not appear in moderation queue`);
  }

  async waitForDecisionDateUpdated(
    locationName: string,
    status: "APPROVED" | "PENDING" | "REJECTED" = "APPROVED",
    timeoutMs = 120000,
  ) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.goToModerationQueue();
      await this.chooseFilterOption("Moderation Status", status);
      await this.setPageSize(100);

      const targetRow = this.findRowByLocationName(locationName);
      if (await targetRow.isVisible().catch(() => false)) {
        const decisionDateCell = targetRow.locator(
          `td:nth-child(${MODERATION_QUEUE_COLUMNS.DECISION_DATE})`,
        );
        const decisionDate = ((await decisionDateCell.textContent()) || "").trim();
        if (decisionDate && decisionDate !== "N/A") {
          return;
        }
      }

      await this.page.waitForTimeout(2000);
    }

    throw new Error(
      `Decision date for "${locationName}" did not update in moderation queue`,
    );
  }

  async expectDefaultSettings() {
    expect(await this.getCurrentPageSize()).toBe(25);

    const rowCount = await this.tableRows().count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(25);

    const createdDateSort = this.page.getByRole("button", {
      name: "Created Date sort",
    });
    await expect(createdDateSort).toBeVisible();

    const createdDates = await this.getColumnValues(
      MODERATION_QUEUE_COLUMNS.CREATED_DATE,
    );
    expect(createdDates.length).toBeGreaterThan(0);
  }

  findRowByLocationName(locationName: string): Locator {
    return this.page.locator("table tbody tr").filter({ hasText: locationName });
  }
}
