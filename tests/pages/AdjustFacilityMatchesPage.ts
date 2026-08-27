import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { FacilitiesApi, SplitMatch } from "../utils/api";

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
      (resp) =>
        resp.request().method() === "GET" &&
        resp.url().includes(`/api/facilities/${osId}/split/`),
      { timeout: 60000 },
    );

    await this.page.getByPlaceholder("Enter an OS ID").first().fill(osId);
    await this.page.getByRole("button", { name: /^search$/i }).first().click();
    const splitResponse = await splitPromise;
    await this.waitForLoadState("domcontentloaded");
    await expect(
      this.page.getByRole("button", { name: /split|promote|transfer/i }).first(),
    ).toBeVisible({ timeout: 60000 });

    return FacilitiesApi.fromSplitBody(await splitResponse.json());
  }

  async clearSearch() {
    await this.page.getByRole("button", { name: /^clear$/i }).click();
    await expect(this.page.getByPlaceholder("Enter an OS ID")).toHaveValue("");
  }

  async transferMatchAt(index: number, alternateOsId: string) {
    const moveResponse = this.page.waitForResponse(
      (resp) =>
        /\/api\/facilities\/.+\/move\//.test(resp.url()) &&
        resp.request().method() === "POST",
      { timeout: 60000 },
    );

    await this.page
      .getByRole("button", { name: /transfer to alternate facility/i })
      .nth(index)
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
    await expect(dialog).toBeHidden({ timeout: 60000 });
    await expect(this.page.locator("img.facility-detail_map")).toBeVisible({
      timeout: 60000,
    });
  }

  async leftPanelName(): Promise<string> {
    const text = (await this.page.locator("#mainPanel").innerText().catch(() => "")) || "";
    return nameAfterLabel(text);
  }

  async leftPanelAddress(): Promise<string> {
    const text = (await this.page.locator("#mainPanel").innerText().catch(() => "")) || "";
    return addressAfterLabel(text);
  }

  async promoteFirstDifferingMatch(leftName: string): Promise<string> {
    const buttons = this.page.getByRole("button", { name: /^promote$/i });
    const count = await buttons.count();
    const left = leftName.trim().toLowerCase();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (!(await button.isEnabled())) {
        continue;
      }
      await button.click();
      const dialog = this.page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: /promote match/i }),
      ).toBeVisible();

      const matchName = await promoteDialogFacilityName(dialog);
      if (!matchName || matchName.trim().toLowerCase() === left) {
        await dialog.getByRole("button", { name: /^cancel$/i }).click();
        await expect(dialog).toBeHidden();
        continue;
      }

      const promoteResponsePromise = this.page.waitForResponse(
        (resp) =>
          /\/api\/facilities\/.+\/promote\//.test(resp.url()) &&
          resp.request().method() === "POST",
        { timeout: 60000 },
      );
      await dialog.getByRole("button", { name: /promote match/i }).click();
      const response = await promoteResponsePromise;
      expect(response.status(), "POST /api/facilities/{osId}/promote/").toBe(200);
      await expect(dialog).toBeHidden({ timeout: 60000 });
      await expect(this.page.locator("img.facility-detail_map")).toBeVisible({
        timeout: 60000,
      });
      return matchName;
    }

    return "";
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

async function promoteDialogFacilityName(
  dialog: Locator,
): Promise<string> {
  const paragraphs = dialog.locator("p");
  const count = await paragraphs.count();
  for (let i = 0; i < count - 1; i++) {
    const text = ((await paragraphs.nth(i).innerText()) || "").trim();
    if (/this will set the canonical facility info to/i.test(text)) {
      return ((await paragraphs.nth(i + 1).innerText()) || "").trim();
    }
  }
  return "";
}

function nameAfterLabel(text: string): string {
  // Standalone "Name" label only — not the suffix of "Contributor Name".
  const lined = text.match(/(?:^|\n)\s*Name\s*\n\s*([^\n]+)/);
  if (lined?.[1]) {
    return lined[1].trim();
  }
  const glued = text.match(/Name(.+?)Address/i);
  return (glued?.[1] || "").trim();
}

function addressAfterLabel(text: string): string {
  const lined = text.match(/Address\s*\n\s*(.+)/i);
  if (lined?.[1]) {
    return lined[1].trim();
  }
  const inline = text.match(/Address\s+(.+?)(?:\s*Country\b|$)/is);
  return (inline?.[1] || "").trim();
}
