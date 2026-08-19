import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DeleteFacilityPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToDeleteFacility() {
    await this.page.goto(`${this.baseUrl}/dashboard/deletefacility`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Delete Facility" }),
    ).toBeVisible({ timeout: 30000 });
  }

  async searchOsId(osId: string) {
    await this.page.getByPlaceholder("Enter an OS ID").fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).click();
    await this.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000);
  }

  async clickDeleteFacility() {
    await this.page.getByRole("button", { name: /delete facility/i }).click();
  }

  async confirmDelete() {
    const dialog = this.page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button", { name: /delete/i }).click();
    }
  }

  async cancelDelete() {
    await this.cancelDeleteDialog();
  }

  async cancelDeleteDialog() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
  }

  async expectApprovedClaimBlockMessage() {
    await this.expectApprovedClaimBlockedMessage();
  }

  async expectApprovedClaimBlockedMessage() {
    await expect(
      this.page.getByText(/Facilities with approved claims cannot be deleted/i),
    ).toBeVisible({ timeout: 30000 });
  }
}
