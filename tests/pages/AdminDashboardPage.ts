import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminDashboardPage extends BasePage {
  private moderationQueueHeading = () => this.page.locator("h2").filter({ hasText: "Moderation Queue" });
  private notFoundHeading = () => this.page.locator("h2").filter({ hasText: "Not found" });
  private signInLink = () => this.page.getByText("Sign in to view your Open Supply Hub Dashboard");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToModerationQueue() {
    await this.page.goto(`${this.baseUrl}/dashboard/moderation-queue`);
    await this.waitForLoadState("networkidle");
    await this.page.waitForTimeout(1000);
  }

  async expectSignInLinkVisible() {
    await this.expectToBeVisible(this.signInLink());
  }

  async clickSignInLink() {
    await this.signInLink().click();
    await this.waitForLoadState();
  }

  async isAuthenticationRequired(): Promise<boolean> {
    try {
      await this.signInLink().waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async expectNotFoundHeading() {
    const heading = this.notFoundHeading();
    await heading.waitFor({ state: "visible", timeout: 5000 });
    await expect(heading).toBeVisible();
    const headingText = (await heading.textContent())?.trim() || "";
    expect(headingText).toContain("Not found");
  }

  async expectModerationQueueHeading() {
    const heading = this.moderationQueueHeading();
    await heading.waitFor({ state: "visible", timeout: 10000 });
    await expect(heading).toBeVisible();
    const headingText = (await heading.textContent())?.trim() || "";
    expect(headingText).toContain("Moderation Queue");
  }

  async expectModerationQueuePage() {
    await this.expectModerationQueueHeading();
    const currentUrl = this.page.url();
    expect(currentUrl).toContain("/dashboard/moderation-queue");
  }

  async getPageHeading(): Promise<string> {
    const heading = this.moderationQueueHeading();
    await heading.waitFor({ state: "visible", timeout: 10000 });
    return (await heading.textContent())?.trim() || "";
  }

  async isOnModerationQueuePage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes("/dashboard/moderation-queue");
  }
}


