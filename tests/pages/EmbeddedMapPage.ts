import fs from "fs";
import os from "os";
import path from "path";
import { FrameLocator, Page, expect } from "@playwright/test";
import {
  EMBED_DOWNLOAD_RESULTS_LIMIT,
  loadEmbeddedMapFixtureHtml,
} from "../utils/downloadLimits";

/**
 * Download UI inside the embedded map iframe (tests/data/testEM-upto10000.html).
 * Embed mode has a per-search download cap (10k results), not annual account quotas.
 */
export class EmbeddedMapPage {
  private mapFrame = (): FrameLocator =>
    this.page.frameLocator('iframe[title="embedded-map"]');

  constructor(
    private readonly page: Page,
    private readonly baseUrl: string
  ) {}

  async openFixture() {
    await this.page.setViewportSize({ width: 1200, height: 1200 });
    const html = loadEmbeddedMapFixtureHtml(this.baseUrl);
    const fixturePath = path.join(os.tmpdir(), "oshub-testEM-upto10000.html");
    fs.writeFileSync(fixturePath, html);
    await this.page.goto(`file://${fixturePath}`);
    await this.waitForMapReady();
  }

  async waitForMapReady() {
    const frame = this.mapFrame();
    const accept = frame.getByRole("button", { name: /^accept$/i });
    if (await accept.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accept.evaluate((el) => (el as HTMLElement).click());
    }
    await frame.getByText(/^\d+ results$/).waitFor({ state: "visible", timeout: 60000 });
  }

  async expectResultsWithinEmbedCap() {
    const resultCount = await this.getResultsCount();
    expect(resultCount).toBeGreaterThan(0);
    expect(resultCount).toBeLessThanOrEqual(EMBED_DOWNLOAD_RESULTS_LIMIT);
  }

  private downloadButton = () => this.mapFrame().getByRole("button", { name: "Download" });
  private purchaseButton = () =>
    this.mapFrame().getByRole("button", { name: "Purchase More Downloads" });
  private csvMenuItem = () => this.mapFrame().getByRole("menuitem", { name: "CSV" });
  private excelMenuItem = () => this.mapFrame().getByRole("menuitem", { name: "Excel" });
  private tooltip = () => this.mapFrame().locator("[role=tooltip]");
  private annualQuotaLeadIn = () =>
    this.mapFrame().getByText(
      /All registered accounts can download up to 5000 production locations annually for free/i
    );
  private resultsText = () => this.mapFrame().getByText(/^\d+ results$/);

  async openDownloadMenu() {
    await this.downloadButton().click({ force: true });
    await this.csvMenuItem().waitFor({ state: "visible" });
  }

  async downloadFacilities(format: "CSV" | "Excel") {
    await this.openDownloadMenu();
    const menuItem = format === "CSV" ? this.csvMenuItem() : this.excelMenuItem();
    await menuItem.click({ force: true });
  }

  async hoverDownloadButton() {
    await this.downloadButton().hover();
    await this.tooltip().first().waitFor({ state: "visible" });
  }

  async expectDownloadButtonVisible() {
    await expect(this.downloadButton()).toBeVisible();
  }

  async expectEmbedResultsLimitTooltip() {
    await expect(this.tooltip()).toContainText(
      `Downloads are supported for searches resulting in ${EMBED_DOWNLOAD_RESULTS_LIMIT} production locations or less`
    );
  }

  async expectDownloadMenuOptions() {
    await this.openDownloadMenu();
    await expect(this.csvMenuItem()).toBeVisible();
    await expect(this.excelMenuItem()).toBeVisible();
    await this.page.keyboard.press("Escape");
  }

  /** Annual quota UI (purchase CTA, 5000 lead-in) is not shown in embed mode. */
  async expectAnnualQuotaUiHidden() {
    await expect(this.purchaseButton()).toHaveCount(0);
    await expect(this.annualQuotaLeadIn()).toHaveCount(0);
  }

  async getResultsCount(): Promise<number> {
    const text = await this.resultsText().textContent();
    return parseInt(text?.match(/\d+/)?.[0] || "0", 10);
  }
}
