import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ContributionRecordPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async expectContributionRecord() {
    await expect(
      this.page.getByRole("heading", {
        name: "Dashboard / Moderation Queue / Contribution Record",
      }),
    ).toBeVisible({ timeout: 20000 });
  }

  async expectPotentialMatchesSection() {
    const heading = this.page.getByText(/Potential Matches/i).first();
    await expect(heading).toBeVisible({ timeout: 30000 });
  }

  moderationIdFromUrl(): string {
    const match = this.page.url().match(
      /\/dashboard\/moderation-queue\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    return match?.[1] ?? "";
  }

  async getFirstPotentialMatchOsId(): Promise<string> {
    await this.expectPotentialMatchesSection();
    const link = this.page
      .locator('a[href*="/production-locations/"], a[href*="/facilities/"]')
      .first();
    await link.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    const href = (await link.getAttribute("href").catch(() => "")) || "";
    const fromHref = href.match(
      /\/(?:production-locations|facilities)\/([A-Z]{2}[A-Z0-9]{13})/i,
    );
    return fromHref?.[1] ?? "";
  }

  async createNewLocation() {
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/production-locations/") &&
        resp.request().method() === "POST",
    );
    await this.page.getByRole("button", { name: /create new location/i }).click();
    return responsePromise;
  }

  async rejectContribution(reason: string) {
    await this.page.getByRole("button", { name: /reject contribution/i }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText(/Reject this Moderation Event/i)).toBeVisible();

    // Avoid Quill toolbar inputs (data-formula / data-link / data-video).
    const candidates = [
      dialog.locator("#dialog-text-field"),
      dialog.locator("#status-change-reason"),
      dialog.locator("textarea"),
      dialog.getByRole("textbox"),
      dialog.locator('input[type="text"]:not([data-formula]):not([data-link]):not([data-video])'),
    ];

    let filled = false;
    for (const candidate of candidates) {
      const target = candidate.first();
      if (await target.isVisible().catch(() => false)) {
        await target.click({ force: true });
        await target.fill(reason);
        filled = true;
        break;
      }
    }

    if (!filled) {
      // Last resort: type into focused field after clicking dialog body.
      await dialog.click();
      await this.page.keyboard.type(reason);
    }

    const patchPromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/moderation-events/") &&
        resp.request().method() === "PATCH",
    );
    await dialog.getByRole("button", { name: /^reject$/i }).click();
    return patchPromise;
  }
}
