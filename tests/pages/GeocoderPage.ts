import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/** Expected geocode payload from OSDEV-1303 ticket description. */
export const OSDEV_1303_EXPECTED = {
  country: "Montenegro",
  address: "Vasa Raickovica 23",
  resultCount: 1,
  lat: 42.4447818,
  lng: 19.2514031,
  geocodedAddress: "23 Vasa Raičkovića, Podgorica, Montenegro",
} as const;

export class GeocoderPage extends BasePage {
  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToGeocoder() {
    await this.page.goto(`${this.baseUrl}/dashboard/geocoder`);
    await this.waitForLoadState("domcontentloaded");
    await this.acceptCookiesIfPresent();
  }

  async expectPage() {
    await expect(this.page).toHaveURL(/\/dashboard\/geocoder\/?$/);
    await expect(
      this.page.getByRole("heading", { name: "Dashboard / Geocoder" }),
    ).toBeVisible({ timeout: 20000 });
  }

  async selectCountry(countryName: string) {
    const container = this.page.locator("#COUNTRIES").first();
    await container.click();
    const input = container.locator('input[id^="react-select-"]').first();
    await input.fill(countryName);
    await this.page.getByText(countryName, { exact: true }).last().click();
  }

  async fillAddress(address: string) {
    await this.page.getByPlaceholder("Enter an address").fill(address);
  }

  async geocode() {
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        /geocod/i.test(resp.url()) &&
        resp.request().method() !== "OPTIONS" &&
        resp.status() !== 0,
      { timeout: 60000 },
    );
    await this.page.getByRole("button", { name: /geocode/i }).click();
    return responsePromise;
  }

  /**
   * Asserts UI response matches OSDEV-1303 description expected JSON.
   */
  async expectGeocodeResult(
    expected: typeof OSDEV_1303_EXPECTED = OSDEV_1303_EXPECTED,
  ) {
    const body = this.page.locator("body");
    await expect(body).toContainText(`"result_count": ${expected.resultCount}`, {
      timeout: 30000,
    });
    await expect(body).toContainText(`"lat": ${expected.lat}`);
    await expect(body).toContainText(`"lng": ${expected.lng}`);
    await expect(body).toContainText(expected.geocodedAddress);
  }
}
