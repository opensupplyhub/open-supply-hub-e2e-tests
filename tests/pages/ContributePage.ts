import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ContributePage extends BasePage {
  private heading = () =>
    this.page.getByRole("heading", {
      name: "Add production location data to OS Hub",
    });
  private uploadMultipleButton = () =>
    this.page.getByRole("button", { name: "Upload Multiple Locations" });
  private singleLocationButton = () =>
    this.page.getByRole("button", { name: "Add a Single Location" });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToContribute() {
    await this.goTo("/contribute");
    await this.acceptCookiesIfPresent();
  }

  async expectContributeHome() {
    await expect(this.page).toHaveURL(/\/contribute\/?$/);
    await this.expectToBeVisible(this.heading());
  }

  async expectUploadMultipleAccess() {
    await this.expectToBeVisible(this.uploadMultipleButton());
  }

  async expectSingleLocationAccess() {
    await this.expectToBeVisible(this.singleLocationButton());
  }

  async openUploadMultipleLocations() {
    await this.uploadMultipleButton().click();
    await this.page.waitForURL("**/contribute/multiple-locations**");
    await expect(this.page.getByRole("heading", { name: "Upload" })).toBeVisible();
  }

  async openSingleLocation() {
    await this.singleLocationButton().click();
    await this.page.waitForURL(/\/contribute\/single-location/);
    await expect(
      this.page.getByRole("heading", { name: "Production Location Search" }),
    ).toBeVisible();
  }
}
