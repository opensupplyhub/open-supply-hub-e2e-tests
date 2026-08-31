import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LocationPage extends BasePage {
  private locationName = () => this.page.getByTestId("location-name");
  private osId = () => this.page.getByTestId("os-id");
  private generalInformationHeading = () =>
    this.page.getByRole("heading", { name: "General Information", exact: true });
  private generalFields = () =>
    this.page.getByTestId("production-location-details-general-fields");
  private geographicSection = () =>
    this.page.getByTestId("geographic-information-section");
  private geographicHeading = () =>
    this.geographicSection().getByRole("heading", {
      name: "Geographic Information",
      exact: true,
    });
  private map = () => this.geographicSection().locator(".leaflet-container");
  private mapTiles = () => this.map().locator(".leaflet-tile-loaded").first();
  private coordinatesRow = () =>
    this.page.getByTestId("production-location-coordinates-row");
  private coordinatesLabel = () =>
    this.coordinatesRow().getByTestId("data-point-label");
  private coordinatesValue = () =>
    this.coordinatesRow().getByTestId("data-point-value");
  private suggestCorrectionLink = () =>
    this.page.getByTestId("contribute-suggest-correction");
  private claimCta = () =>
    this.page.getByRole("link", {
      name: "I want to claim this production location",
    });
  private reportStatusControl = () =>
    this.page.getByTestId("contribute-report-status");
  private reportStatusDialog = () =>
    this.page.getByTestId("report-facility-status-dialog");
  private reportStatusLogin = () =>
    this.page.getByTestId("report-facility-status-dialog-login");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToOsId(osId: string) {
    await this.goTo(`/production-locations/${osId}`);
    await this.acceptCookiesIfPresent();
    await this.expectOpened(osId);
  }

  async expectOpened(osId: string) {
    await expect(this.page).toHaveURL(
      new RegExp(`/production-locations/${osId}/?$`),
    );
    await this.expectToBeVisible(this.locationName());
    await this.expectToBeVisible(this.osId());
    await expect(this.osId()).toContainText(osId);
  }

  async expectGeneralInformationLoaded() {
    await this.expectToBeVisible(this.generalInformationHeading());
    await this.expectToBeVisible(this.generalFields());
  }

  async expectGeographicInformationWithMap() {
    await this.geographicSection().scrollIntoViewIfNeeded();
    await this.expectToBeVisible(this.geographicHeading());
    await this.expectToBeVisible(this.map());
    await this.expectToBeVisible(this.mapTiles());
  }

  async expectCoordinatesDisplayed() {
    await this.coordinatesRow().scrollIntoViewIfNeeded();
    await this.expectToBeVisible(this.coordinatesRow());
    await expect(this.coordinatesLabel()).toHaveText("Coordinates");
    await expect(this.coordinatesValue()).toHaveText(
      /^-?\d+(?:\.\d+)?, -?\d+(?:\.\d+)?$/,
    );

    const [lat, lng] = (await this.coordinatesValue().innerText())
      .split(",")
      .map((part) => Number(part.trim()));
    expect(lat, "coordinate latitude").toBeGreaterThanOrEqual(-90);
    expect(lat, "coordinate latitude").toBeLessThanOrEqual(90);
    expect(lng, "coordinate longitude").toBeGreaterThanOrEqual(-180);
    expect(lng, "coordinate longitude").toBeLessThanOrEqual(180);
  }

  async expectSuggestCorrectionVisible() {
    await expect(this.suggestCorrectionLink()).toBeVisible();
  }

  async chooseSuggestCorrection() {
    const href = (await this.suggestCorrectionLink().getAttribute("href")) ?? "";
    expect(href).toMatch(/\/contribute\/single-location\/[^/]+\/info\/?$/);
    await Promise.all([
      this.page
        .waitForURL(/\/contribute\/single-location\//, { timeout: 5000 })
        .catch(() => null),
      this.suggestCorrectionLink().click(),
    ]);
    if (!this.page.url().includes("/contribute/")) {
      await this.goTo(href);
    }
  }

  async expectClaimCtaVisible() {
    await expect(this.claimCta()).toBeVisible();
  }

  async chooseClaim() {
    await this.claimCta().click();
    await this.page.waitForURL(/\/claim\//);
  }

  async expectReportStatusLabel(label: "Report Closure / Move" | "Report Reopened") {
    await expect(this.reportStatusControl()).toHaveText(label);
  }

  async chooseReportStatus() {
    await this.reportStatusControl().click();
    await expect(this.reportStatusDialog()).toBeVisible();
  }

  async expectReportStatusLoginPrompt(kind: "closed" | "reopened") {
    const dialog = this.reportStatusDialog();
    const title =
      kind === "closed"
        ? "Report production location closed"
        : "Report production location reopened";
    const message =
      kind === "closed"
        ? "You must be logged in to report this production location as closed"
        : "You must be logged in to report this production location as reopened";
    await expect(dialog.getByText(title)).toBeVisible();
    await expect(dialog.getByText(message)).toBeVisible();
    await expect(this.reportStatusLogin()).toBeVisible();
    await expect(this.reportStatusLogin()).toHaveAttribute("href", "/auth/login");
  }

  async closeReportStatusDialog() {
    await this.page.keyboard.press("Escape");
    await expect(this.reportStatusDialog()).toHaveCount(0);
  }
}
