import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class UpdateFacilityLocationPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  private osIdInput() {
    return this.page.getByPlaceholder(/enter an os id/i).first();
  }

  async goToUpdateLocation() {
    await this.page.goto(`${this.baseUrl}/dashboard/updatefacilitylocation`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(
      this.page.getByRole("heading", {
        name: "Dashboard / Update Facility Location",
      }),
    ).toBeVisible({ timeout: 30000 });
    // Map layout shift can delay the form; wait for the search field itself.
    await expect(this.osIdInput()).toBeVisible({ timeout: 30000 });
  }

  async searchOsId(osId: string) {
    await this.acceptCookiesIfPresent();
    const input = this.osIdInput();
    await expect(input).toBeVisible({ timeout: 30000 });
    // Google Map on this page keeps the field "unstable" for actionability.
    await input.fill(osId, { force: true });
    await this.page.getByRole("button", { name: /^search$/i }).click();
    await this.waitForLoadState("domcontentloaded");
    const lng = this.page
      .getByPlaceholder("Longitude")
      .or(this.page.getByLabel("Longitude"));
    await expect(lng.first()).toBeEnabled({ timeout: 30000 });
  }

  async setCoordinates(longitude: string, latitude: string, notes?: string) {
    const lng = this.page
      .getByPlaceholder("Longitude")
      .or(this.page.getByLabel("Longitude"))
      .first();
    const lat = this.page
      .getByPlaceholder("Latitude")
      .or(this.page.getByLabel("Latitude"))
      .first();
    await lng.fill(longitude, { force: true });
    await lat.fill(latitude, { force: true });
    if (notes) {
      await this.page.getByPlaceholder("Notes (optional)").fill(notes, {
        force: true,
      });
    }
    await expect(lng).toHaveValue(longitude);
    await expect(lat).toHaveValue(latitude);
  }

  async updateLocation() {
    const updateButton = this.page.getByRole("button", {
      name: /update location/i,
    });
    await expect(updateButton).toBeEnabled({ timeout: 15000 });
    const responsePromise = this.page
      .waitForResponse(
        (resp) =>
          /\/api\/facilities\//.test(resp.url()) &&
          resp.request().method() !== "GET",
        { timeout: 60000 },
      )
      .catch(() => null);
    await updateButton.click();
    await responsePromise;
    await this.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1500);
  }

  async getPanelText(): Promise<string> {
    return (await this.page.locator("#mainPanel").innerText()) || "";
  }
}
