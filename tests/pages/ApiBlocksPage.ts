import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ApiBlocksPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToApiBlocks() {
    await this.page.goto(`${this.baseUrl}/dashboard/apiblocks`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / API Blocks" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      this.page.getByRole("heading", { name: "Active API Blocks" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "All API Blocks" }),
    ).toBeVisible();
  }

  /**
   * Asserts /api/api-blocks/ completes successfully so the page can render.
   * Currently broken by OSDEV-961 (request timeout / empty page).
   */
  async expectBlocksDataLoaded() {
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/api-blocks/") && resp.request().method() === "GET",
      { timeout: 60000 },
    );

    await this.goToApiBlocks();
    await this.expectPage();

    const response = await responsePromise;
    expect(
      response.status(),
      "GET /api/api-blocks/ must succeed (OSDEV-961 if timeout/5xx)",
    ).toBe(200);

    // Page must leave the broken empty state (no spinner stuck forever).
    await expect(
      this.page.getByRole("progressbar"),
    ).toHaveCount(0, { timeout: 15000 });
  }
}
