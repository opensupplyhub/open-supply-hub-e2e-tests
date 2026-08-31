import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ClaimedFacilitiesPage extends BasePage {
  private heading = () =>
    this.page.getByRole("heading", { name: "My Claimed Facilities" });
  private tableRows = () => this.page.locator("table tbody tr");
  private detailsHeading = () =>
    this.page.getByRole("heading", { name: "Claimed Facility Details" });
  private saveButton = () => this.page.getByRole("button", { name: /^SAVE$/i });
  private descriptionInput = () =>
    this.page
      .getByText("Description", { exact: true })
      .locator("xpath=following::*[self::input or self::textarea][1]");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async expectClaimedList() {
    await expect(this.page).toHaveURL(/\/claimed\/?$/);
    await this.expectToBeVisible(this.heading());
    await expect(this.page.getByText("Name", { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText("OS ID", { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText("Address", { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText("Country", { exact: true }).first()).toBeVisible();
    await expect(this.tableRows().first()).toBeVisible({ timeout: 30000 });
  }

  async openFirstClaim() {
    await this.tableRows().first().click();
    await this.page.waitForURL(/\/claimed\/\d+\/?/);
    await this.expectToBeVisible(this.detailsHeading());
    await this.expectToBeVisible(this.saveButton());
  }

  async getDescription(): Promise<string> {
    return this.descriptionInput().inputValue();
  }

  async fillDescription(value: string) {
    await this.descriptionInput().fill(value);
  }

  async saveClaimDetails() {
    const saveResponse = this.page.waitForResponse(
      (resp) =>
        /\/api\/facility-claims\/\d+/.test(resp.url()) &&
        ["PUT", "PATCH", "POST"].includes(resp.request().method()) &&
        resp.status() < 400,
      { timeout: 30000 },
    );
    await this.saveButton().click();
    await saveResponse;
  }
}
