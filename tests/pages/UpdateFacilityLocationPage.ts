import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class UpdateFacilityLocationPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  private osIdInput() {
    return this.page.getByPlaceholder("Enter an OS ID").first();
  }

  private longitudeInput() {
    return this.page
      .getByPlaceholder("Longitude")
      .or(this.page.getByLabel("Longitude"))
      .first();
  }

  private latitudeInput() {
    return this.page
      .getByPlaceholder("Latitude")
      .or(this.page.getByLabel("Latitude"))
      .first();
  }

  private updateLocationButton() {
    return this.page.getByRole("button", { name: /update location/i }).first();
  }

  private confirmDialog() {
    return this.page.getByRole("dialog");
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
  }

  async clearSearch() {
    const clear = this.page.getByRole("button", { name: /^clear$/i });
    if (!(await clear.isVisible().catch(() => false))) {
      return;
    }
    await clear.click();
    await expect(this.osIdInput()).toHaveValue("");
  }

  async searchOsId(osId: string) {
    await this.acceptCookiesIfPresent();
    await this.clearSearch();
    const input = this.osIdInput();
    await input.fill(osId, { force: true });
    await this.page.getByRole("button", { name: /^search$/i }).click();
    await this.waitForLoadState("domcontentloaded");
    await expect(this.longitudeInput()).toBeEnabled({ timeout: 30000 });
  }

  async setCoordinates(longitude: string, latitude: string, notes?: string) {
    const lng = this.longitudeInput();
    const lat = this.latitudeInput();
    await lng.click({ force: true });
    await lng.fill(longitude, { force: true });
    await lat.click({ force: true });
    await lat.fill(latitude, { force: true });
    if (notes) {
      await this.page.getByPlaceholder("Notes (optional)").fill(notes, {
        force: true,
      });
    }
    await lat.blur();
    await expect(lng).toHaveValue(longitude);
    await expect(lat).toHaveValue(latitude);
  }

  private async selectFirstOrganizationIfPresent() {
    const container = this.page.locator("#contributors");
    if (!(await container.isVisible().catch(() => false))) {
      return;
    }
    await container.click();
    const option = this.page
      .locator("[id^='react-select-'][id$='-option-']")
      .first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
    } else {
      await this.page.keyboard.press("Enter");
    }
  }

  async updateLocation() {
    const formButton = this.updateLocationButton();
    if (!(await formButton.isEnabled().catch(() => false))) {
      await this.selectFirstOrganizationIfPresent();
    }
    await expect(formButton).toBeEnabled({ timeout: 15000 });
    await formButton.click();

    const dialog = this.confirmDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await dialog.getByRole("button", { name: /update location/i }).click();
    await expect(dialog).toBeHidden({ timeout: 60000 });
  }

  async expectLeftPanelCoordinates(longitude: string, latitude: string) {
    const panel = this.page.locator("#mainPanel");
    await expect(panel).toBeVisible({ timeout: 30000 });
    await expect(panel).toContainText(`${longitude}, ${latitude}`, {
      timeout: 30000,
    });
  }

  async getPanelText(): Promise<string> {
    return (await this.page.locator("#mainPanel").innerText()) || "";
  }
}
