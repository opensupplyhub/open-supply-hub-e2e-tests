import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LinkOsIdPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToLinkId() {
    await this.page.goto(`${this.baseUrl}/dashboard/linkid`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Link to New OS ID" }),
    ).toBeVisible({ timeout: 20000 });
  }

  private osIdInputs() {
    return this.page.getByPlaceholder("Enter an OS ID");
  }

  async searchOldOsId(osId: string) {
    await this.osIdInputs().nth(0).fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).nth(0).click();
    await this.waitForLoadState("domcontentloaded");
  }

  async searchNewOsId(osId: string) {
    await this.osIdInputs().nth(1).fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).nth(1).click();
    await this.waitForLoadState("domcontentloaded");
  }

  async linkFacility() {
    await this.page.getByRole("button", { name: /link facility/i }).click();
    await this.waitForLoadState("domcontentloaded");
  }
}
