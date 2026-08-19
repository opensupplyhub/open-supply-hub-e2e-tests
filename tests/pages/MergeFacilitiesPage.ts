import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MergeFacilitiesPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToMerge() {
    await this.goToMergeFacilities();
  }

  async goToMergeFacilities() {
    await this.page.goto(`${this.baseUrl}/dashboard/mergefacilities`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Merge Facilities" }),
    ).toBeVisible({ timeout: 30000 });
  }

  private osIdInputs() {
    return this.page.getByPlaceholder("Enter an OS ID");
  }

  async searchTarget(osId: string) {
    await this.osIdInputs().nth(0).fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).first().click();
    await this.page.waitForTimeout(1000);
  }

  async searchMergeInto(osId: string) {
    const inputs = this.osIdInputs();
    const count = await inputs.count();
    await inputs.nth(Math.max(count - 1, 0)).fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).last().click();
    await this.page.waitForTimeout(1000);
  }

  async searchBoth(targetOsId: string, mergeOsId: string) {
    await this.searchTarget(targetOsId);
    await this.searchMergeInto(mergeOsId);
  }

  async flipFacilities() {
    await this.page.getByRole("button", { name: /flip facilities/i }).click();
    await this.page.waitForTimeout(500);
  }

  async getPanelText(): Promise<string> {
    return (await this.page.locator("#mainPanel").innerText()) || "";
  }

  async clickMergeFacilities() {
    await this.page.getByRole("button", { name: /merge facilities/i }).first().click();
  }

  async confirmMerge() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /merge/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async cancelMerge() {
    await this.cancelMergeDialog();
  }

  async cancelMergeDialog() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
  }

  async expectMergedToast() {
    await expect(
      this.page.getByText(/Facilities were merged|merged/i).first(),
    ).toBeVisible({ timeout: 30000 });
  }
}
