import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdjustFacilityMatchesPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToAdjust() {
    await this.goToAdjustMatches();
  }

  async goToAdjustMatches() {
    await this.page.goto(`${this.baseUrl}/dashboard/adjustfacilitymatches`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", {
        name: "Dashboard / Adjust Facility Matches",
      }),
    ).toBeVisible({ timeout: 30000 });
  }

  async searchOsId(osId: string) {
    await this.page.getByPlaceholder("Enter an OS ID").fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).click();
    await this.waitForLoadState("domcontentloaded");
    await expect(
      this.page.getByRole("button", { name: /split|promote|transfer/i }).first(),
    ).toBeVisible({ timeout: 60000 });
  }

  async transferFirstMatchTo(alternateOsId: string) {
    await this.transferFirstMatch(alternateOsId);
  }

  async transferFirstMatch(alternateOsId: string) {
    await this.page
      .getByRole("button", { name: /transfer to alternate facility/i })
      .first()
      .click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Enter an OS ID").fill(alternateOsId);
    await dialog.getByRole("button", { name: /^search$/i }).click();
    await expect(
      dialog.getByRole("button", { name: /transfer match/i }),
    ).toBeEnabled({ timeout: 30000 });
    await dialog.getByRole("button", { name: /transfer match/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async promoteMatchWithDifferentName(canonicalName = "") {
    void canonicalName;
    await this.promoteFirstDifferingMatch();
  }

  async promoteFirstDifferingMatch() {
    const promoteButtons = this.page.getByRole("button", { name: /^promote$/i });
    await expect(promoteButtons.first()).toBeVisible({ timeout: 30000 });
    await promoteButtons.first().click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /promote match/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async splitFirstMatch() {
    await this.page.getByRole("button", { name: /^split$/i }).first().click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const confirm = dialog
      .getByRole("button", { name: /create|split|confirm/i })
      .last();
    await confirm.click();
    await this.page.waitForTimeout(2000);
  }
}
