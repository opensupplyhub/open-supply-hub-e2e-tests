import { Download, Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class FacilityClaimsPage extends BasePage {
  private tableRows = () => this.claimsTable().locator("tbody tr");
  private downloadButton = () =>
    this.page.locator("button[aria-label='Download Excel']");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  private claimsTable() {
    return this.page.locator("table").filter({ hasText: "Claim ID" }).first();
  }

  async goToClaims(query = "") {
    const search = query.replace(/^\//, "");
    const expected = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );

    const claimsResponse = this.page.waitForResponse(
      (resp) => {
        if (
          !resp.url().includes("/api/facility-claims") ||
          resp.request().method() !== "GET" ||
          resp.status() !== 200
        ) {
          return false;
        }
        for (const [key, value] of expected.entries()) {
          if (!resp.url().includes(`${key}=${encodeURIComponent(value)}`) &&
              !resp.url().includes(`${key}=${value}`)) {
            return false;
          }
        }
        return true;
      },
      { timeout: 60000 },
    );

    await this.page.goto(`${this.baseUrl}/dashboard/claims${query}`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
    await claimsResponse;
    await this.expectTableVisible();
  }

  async expectClaimsPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Facility Claims" }),
    ).toBeVisible({ timeout: 30000 });
  }

  async expectTableVisible() {
    await expect(this.tableRows().first()).toBeVisible({ timeout: 60000 });
  }

  async expectRowsPresent() {
    await this.expectTableVisible();
    expect(await this.tableRows().count()).toBeGreaterThan(0);
  }

  async expectTableColumns() {
    for (const header of [
      "Claim ID",
      "Facility Name",
      "Organization Name",
      "Country",
      "Created",
      "Claim Decision",
      "Status",
      "Last Updated",
    ]) {
      await expect(this.page.getByText(header, { exact: true }).first()).toBeVisible();
    }
  }

  async chooseMultiFilter(containerId: string, value: string) {
    if (containerId === "CLAIM_STATUSES") {
      await this.filterByStatus(value);
      return;
    }
    if (containerId === "COUNTRIES") {
      await this.filterByCountry(value);
      return;
    }
    await this.chooseReactSelect(containerId, value);
  }

  async expectReviewNoteVisible(note: string) {
    await expect(this.page.getByText(note)).toBeVisible({ timeout: 30000 });
  }

  async getHeaders(): Promise<string[]> {
    const headers = this.page.locator("table thead th, table thead button");
    const values: string[] = [];
    for (const header of await headers.all()) {
      const text = ((await header.textContent()) || "").trim();
      if (text) {
        values.push(text.replace(/\s*sort$/i, "").trim());
      }
    }
    return values;
  }

  private async chooseReactSelect(containerId: string, optionText: string) {
    const container = this.page.locator(`#${containerId}`);
    await container.click();
    const input = container.locator('input[id^="react-select-"], input[type="text"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(optionText);
    }
    const option = this.page
      .locator("[class*='option'], [id*='option'], [role='option']")
      .filter({ hasText: new RegExp(`^${optionText}$`, "i") })
      .first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    await this.page.waitForTimeout(1000);
  }

  async filterByStatus(status: string) {
    await this.chooseReactSelect("CLAIM_STATUSES", status);
    await this.expectTableVisible();
  }

  async filterByCountry(countryName: string) {
    await this.chooseReactSelect("COUNTRIES", countryName);
    await this.expectTableVisible();
  }

  async getStatusColumnValues(limit = 10): Promise<string[]> {
    return this.getColumnValuesByHeader("Status", limit);
  }

  async getCountryColumnValues(limit = 10): Promise<string[]> {
    return this.getColumnValuesByHeader("Country", limit);
  }

  private async readColumnValues(
    header: string,
    limit = 10,
  ): Promise<string[]> {
    return this.claimsTable().evaluate(
      (table, args) => {
        const heads = [...table.querySelectorAll("thead th")].map((th) =>
          (th.textContent || "")
            .replace(/\s*sort$/i, "")
            .trim()
            .toLowerCase(),
        );
        const index = heads.findIndex((name) =>
          name.includes(args.header.toLowerCase()),
        );
        if (index < 0) {
          return [];
        }
        return [...table.querySelectorAll("tbody tr")]
          .slice(0, args.limit)
          .map((row) => {
            const cells = [...row.querySelectorAll("th, td")];
            return (cells[index]?.textContent || "").trim();
          })
          .filter((value) => value.length > 0);
      },
      { header, limit },
    );
  }

  private async getColumnValuesByHeader(
    header: string,
    limit = 10,
  ): Promise<string[]> {
    await this.expectTableVisible();
    await expect
      .poll(async () => (await this.readColumnValues(header, limit)).length, {
        timeout: 60000,
        intervals: [500, 1000, 2000, 3000],
      })
      .toBeGreaterThan(0);
    return this.readColumnValues(header, limit);
  }

  async getFirstRowCountry(): Promise<string> {
    const values = await this.getCountryColumnValues(1);
    return values[0] || "";
  }

  async getFirstRowOsId(): Promise<string> {
    await this.expectTableVisible();
    const href =
      (await this.tableRows()
        .first()
        .locator(
          'a[href*="/facilities/"], a[href*="/production-locations/"]',
        )
        .first()
        .getAttribute("href")) || "";
    const match = href.match(
      /\/(?:facilities|production-locations)\/([A-Z]{2}\d{7}[A-Z0-9]+)/i,
    );
    return match ? match[1].toUpperCase() : "";
  }

  async openClaimById(claimId: string | number) {
    await this.page.goto(`${this.baseUrl}/dashboard/claims/${claimId}`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
    await expect(
      this.page.getByRole("heading", {
        name: "Dashboard / Facility Claims / Facility Claim Details",
      }),
    ).toBeVisible({ timeout: 30000 });
  }

  async openFirstClaimFromTable() {
    const firstClaimIdCell = this.tableRows().first().locator("td").first();
    const claimId = ((await firstClaimIdCell.textContent()) || "").trim();
    await firstClaimIdCell.click();
    await this.waitForLoadState("domcontentloaded");
    return claimId;
  }

  async expectClaimStatus(status: string) {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible({
      timeout: 30000,
    });
  }

  async addReviewNote(note: string) {
    const noteField = this.page.locator("#add-claim-review-note").last();
    await noteField.fill(note);
    await this.page.getByRole("button", { name: /^submit$/i }).click();
    await this.page.waitForTimeout(1000);
    await expect(this.page.getByText(note)).toBeVisible({ timeout: 30000 });
  }

  private dialogReasonField(): Locator {
    const dialog = this.page.getByRole("dialog");
    return dialog.locator("#dialog-text-field").or(dialog.locator("textarea, input[type='text']")).first();
  }

  async approveClaim(reason: string) {
    await this.page.getByRole("button", { name: /approve claim/i }).click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.dialogReasonField().fill(reason);
    await this.page.getByRole("dialog").getByRole("button", { name: /^approve$/i }).click();
  }

  async denyClaim(reason: string) {
    await this.page.getByRole("button", { name: /deny claim/i }).click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.dialogReasonField().fill(reason);
    await this.page.getByRole("dialog").getByRole("button", { name: /^deny$/i }).click();
  }

  async revokeClaim(reason?: string) {
    await this.page.getByRole("button", { name: /revoke claim/i }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if (reason) {
      const field = this.dialogReasonField();
      if (await field.isVisible().catch(() => false)) {
        await field.fill(reason);
      }
    }
    await dialog.getByRole("button", { name: /^revoke$/i }).click();
  }

  async openLocationFromClaim(): Promise<string> {
    const link = this.page.locator("a[href*='/facilities/'], a[href*='/production-locations/']").first();
    await expect(link).toBeVisible();
    const href = (await link.getAttribute("href")) || "";
    await link.click();
    await this.waitForLoadState("domcontentloaded");
    return href;
  }

  async downloadExcel(): Promise<Download> {
    await expect(this.downloadButton()).toBeVisible();
    const downloadPromise = this.page.waitForEvent("download");
    await this.downloadButton().click();
    return downloadPromise;
  }
}
