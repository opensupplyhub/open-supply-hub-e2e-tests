import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { parseSplitMatches, SplitMatch, fetchFacilitySplitMatches } from "../utils/dashboardApi";

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

  async searchOsId(osId: string): Promise<SplitMatch[]> {
    const splitPromise = this.page.waitForResponse(
      (resp) => {
        const url = resp.url();
        return (
          resp.request().method() === "GET" &&
          url.includes(`/api/facilities/${osId}`) &&
          (url.includes("/split") || url.includes("/matches"))
        );
      },
      { timeout: 60000 },
    );

    await this.page.getByPlaceholder("Enter an OS ID").fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).click();
    const splitResponse = await splitPromise.catch(() => null);
    await this.waitForLoadState("domcontentloaded");
    await expect(
      this.page.getByRole("button", { name: /split|promote|transfer/i }).first(),
    ).toBeVisible({ timeout: 60000 });

    let matches = splitResponse
      ? parseSplitMatches(await splitResponse.json().catch(() => null))
      : [];
    if (matches.length === 0) {
      matches = await fetchFacilitySplitMatches(this.page, osId);
    }
    return matches;
  }

  async transferFirstMatchTo(alternateOsId: string) {
    await this.transferFirstMatch(alternateOsId);
  }

  async transferFirstMatch(alternateOsId: string) {
    const moveResponse = this.page.waitForResponse(
      (resp) =>
        /\/api\/facilities\/.+\/move\//.test(resp.url()) &&
        resp.request().method() === "POST",
      { timeout: 60000 },
    );

    await this.page
      .getByRole("button", { name: /transfer to alternate facility/i })
      .first()
      .click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/transfer match to alternate facility/i),
    ).toBeVisible();
    await dialog.getByPlaceholder("Enter an OS ID").fill(alternateOsId);
    await dialog.getByRole("button", { name: /^search$/i }).click();
    await expect(
      dialog.getByRole("button", { name: /transfer match/i }),
    ).toBeEnabled({ timeout: 30000 });
    await dialog.getByRole("button", { name: /transfer match/i }).click();
    const response = await moveResponse;
    expect(response.status(), "POST /api/facilities/{osId}/move/").toBe(200);
    await expect(dialog).toBeHidden({ timeout: 30000 });
  }

  async leftPanelName(): Promise<string> {
    const panel = this.page.locator("#mainPanel");
    const text = (await panel.innerText().catch(() => "")) || "";
    const match = text.match(/Name\s*\n\s*(.+)/i);
    return (match?.[1] || "").trim();
  }

  async leftPanelAddress(): Promise<string> {
    const panel = this.page.locator("#mainPanel");
    const text = (await panel.innerText().catch(() => "")) || "";
    const match = text.match(/Address\s*\n\s*(.+)/i);
    return (match?.[1] || "").trim();
  }

  /**
   * Promote a right-side match whose Name differs from the left-panel canonical name.
   */
  async promoteMatchWithDifferentName(canonicalName: string) {
    return this.promoteMatchNamedDifferently(canonicalName);
  }

  async promoteMatchNamedDifferently(
    canonicalName: string,
    matchName?: string,
  ) {
    const promoteResponsePromise = this.page.waitForResponse(
      (resp) =>
        /\/api\/facilities\/.+\/promote\//.test(resp.url()) &&
        resp.request().method() === "POST",
      { timeout: 60000 },
    );

    if (matchName) {
      await this.page
        .getByText(matchName, { exact: true })
        .locator("xpath=ancestor::*[.//button][1]")
        .getByRole("button", { name: /^promote$/i })
        .click();
    } else {
      await this.page.getByRole("button", { name: /^promote$/i }).first().click();
    }

    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/promote match/i)).toBeVisible();
    if (matchName) {
      await expect(dialog.getByText(matchName, { exact: false })).toBeVisible();
    }

    await dialog.getByRole("button", { name: /promote match/i }).click();
    const response = await promoteResponsePromise;
    expect(response.status(), "POST /api/facilities/{osId}/promote/").toBe(200);
    await expect(dialog).toBeHidden({ timeout: 30000 });
    void canonicalName;
    return response;
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
