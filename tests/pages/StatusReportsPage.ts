import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

const TABLE_TIMEOUT_MS = 5 * 60 * 1000;

export class StatusReportsPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToStatusReports() {
    const reportsResponse = this.page
      .waitForResponse(
        (resp) =>
          /facility-activity-reports|activity-reports/i.test(resp.url()) &&
          resp.request().method() === "GET",
        { timeout: TABLE_TIMEOUT_MS },
      )
      .catch(() => null);
    await this.page.goto(`${this.baseUrl}/dashboard/activityreports`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
    await reportsResponse;
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Status Reports" }),
    ).toBeVisible({ timeout: 30000 });
  }

  async openClosuresTab() {
    await this.expectPage();
    const tab = this.page.getByRole("tab", { name: /^closures$/i });
    await expect(tab).toBeVisible({ timeout: 20000 });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await this.waitForTableRows();
  }

  async openReopeningsTab() {
    await this.expectPage();
    const tab = this.page.getByRole("tab", { name: /^reopenings$/i });
    await expect(tab).toBeVisible({ timeout: 20000 });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await this.waitForTableRows();
  }

  private async fillStatusChangeReason(reason: string) {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const reasonField = dialog.locator("#status-change-reason");
    if (await reasonField.isVisible().catch(() => false)) {
      await reasonField.fill(reason);
      return;
    }
    const dialogField = dialog.locator("#dialog-text-field");
    if (await dialogField.isVisible().catch(() => false)) {
      await dialogField.fill(reason);
      return;
    }
    await dialog.getByRole("textbox").first().fill(reason);
  }

  async confirmFirstPending(reason: string) {
    const confirm = this.page.getByRole("button", { name: /^confirm$/i }).first();
    await expect(confirm).toBeVisible({ timeout: 30000 });
    await confirm.click();
    await this.fillStatusChangeReason(reason);
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: /^confirm$/i })
      .click();
    await this.waitForLoadState("domcontentloaded");
  }

  /** Visible data rows in Status Reports tables. */
  private tableRows() {
    return this.page.locator("table tbody tr").locator("visible=true");
  }

  private async waitForTableRows() {
    await expect(this.tableRows().first()).toBeVisible({
      timeout: TABLE_TIMEOUT_MS,
    });
  }

  /** OS IDs from facility links in currently visible table rows. */
  async collectOsIdsFromTable(): Promise<string[]> {
    await this.waitForTableRows();
    const hrefs = await this.tableRows()
      .locator('a[href*="/facilities/"], a[href*="/production-locations/"]')
      .evaluateAll((anchors) =>
        anchors.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""),
      );
    const ids: string[] = [];
    for (const href of hrefs) {
      const match = href.match(
        /\/(?:facilities|production-locations)\/([A-Z]{2}\d{7}[A-Z0-9]+)/i,
      );
      if (match && !ids.includes(match[1].toUpperCase())) {
        ids.push(match[1].toUpperCase());
      }
    }
    return ids;
  }

  /** Pending reopening row: OS ID link/text + Confirm (not the Closures CONFIRMED row). */
  private pendingConfirmButton(osId: string) {
    return this.page
      .locator("table tbody tr")
      .filter({
        has: this.page
          .locator(`a[href*="${osId}"]`)
          .or(this.page.getByText(osId, { exact: true })),
      })
      .getByRole("button", { name: /confirm/i })
      .first();
  }

  async confirmPendingForOsId(osId: string, reason: string) {
    await this.waitForTableRows();
    const confirm = this.pendingConfirmButton(osId);
    await expect(confirm).toBeVisible({ timeout: TABLE_TIMEOUT_MS });
    await confirm.click();
    await this.fillStatusChangeReason(reason);
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: /confirm/i })
      .click();
    await this.waitForLoadState("domcontentloaded");
    const row = this.page
      .locator("table tbody tr")
      .filter({
        has: this.page
          .locator(`a[href*="${osId}"]`)
          .or(this.page.getByText(osId, { exact: true })),
      })
      .filter({ hasText: /CONFIRMED/i })
      .first();
    await expect(row).toBeVisible({ timeout: 30000 });
  }

  async confirmPendingForFacility(facilityName: string, reason: string) {
    const row = this.tableRows().filter({ hasText: facilityName }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.getByRole("button", { name: /^confirm$/i }).click();
    } else {
      await this.confirmFirstPending(reason);
      return;
    }
    await this.fillStatusChangeReason(reason);
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: /^confirm$/i })
      .click();
    await this.waitForLoadState("domcontentloaded");
  }

  async expectConfirmActionAvailable() {
    await expect(
      this.page.getByRole("button", { name: /^confirm$/i }).first(),
    ).toBeVisible({ timeout: 30000 });
  }

  async rejectFirstPending(reason: string) {
    const reject = this.page.getByRole("button", { name: /^reject$/i }).first();
    await expect(reject).toBeVisible({ timeout: 30000 });
    await reject.click();
    await this.fillStatusChangeReason(reason);
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: /^reject$/i })
      .click();
    await this.waitForLoadState("domcontentloaded");
  }
}
