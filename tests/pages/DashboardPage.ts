import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export const DASHBOARD_MODERATOR_LINKS = [
  "View Contributor Lists",
  "View Facility Claims",
  "Delete a Facility",
  "Merge Two Facilities",
  "Moderation Queue",
  "Adjust Facility Matches",
  "Update Facility Location",
  "View API Blocks",
  "View Status Reports",
  "Link to New OS ID",
  "Geocode",
] as const;

export class DashboardPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToDashboard() {
    await this.page.goto(`${this.baseUrl}/dashboard`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectModeratorDashboard() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    for (const name of DASHBOARD_MODERATOR_LINKS) {
      await expect(this.page.getByRole("link", { name })).toBeVisible();
    }
  }

  async expectNotFound() {
    await expect(
      this.page.getByRole("heading", { name: "Not found" }),
    ).toBeVisible({ timeout: 15000 });
  }

  async expectSignInNotice() {
    await expect(
      this.page.getByRole("link", {
        name: "Sign in to view your Open Supply Hub Dashboard",
      }),
    ).toBeVisible({ timeout: 15000 });
  }

  async openModeratorLink(name: (typeof DASHBOARD_MODERATOR_LINKS)[number]) {
    await this.page.getByRole("link", { name }).click();
    await this.waitForLoadState("domcontentloaded");
  }
}
