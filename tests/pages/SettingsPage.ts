import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export type ProfileDetails = {
  name: string;
  description: string;
  website: string;
};

export class SettingsPage extends BasePage {
  private heading = () => this.page.getByRole("heading", { name: "Settings" });
  private profileTab = () => this.page.getByRole("tab", { name: "Profile" });
  private embedTab = () => this.page.getByRole("tab", { name: "Embed" });
  private apiTab = () => this.page.getByRole("tab", { name: "API", exact: true });
  private cookiePreferencesHeading = () =>
    this.page.getByRole("heading", { name: "Cookie Preferences" });
  private cookiePreferencesSection = () =>
    this.page.locator("section, div").filter({ has: this.cookiePreferencesHeading() });
  private cookieAcceptButton = () =>
    this.page.getByRole("button", { name: /^accept$/i });
  private cookieRejectButton = () =>
    this.cookiePreferencesSection().getByRole("button", { name: /^reject$/i }).first();
  private nameInput = () => this.page.locator("#name");
  private descriptionInput = () => this.page.locator("#description");
  private websiteInput = () => this.page.locator("#website");
  private organizationTypeControl = () =>
    this.page.locator("p.form__select-input-container");
  private currentPasswordInput = () => this.page.locator("#currentPassword");
  private newPasswordInput = () => this.page.locator("#newPassword");
  private confirmNewPasswordInput = () => this.page.locator("#confirmNewPassword");
  private saveButton = () => this.page.getByRole("button", { name: "Save Changes" });
  private updatedProfileToast = () => this.page.getByText("Updated profile!");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async expectProfileForm(email: string) {
    await expect(this.page).toHaveURL(/\/settings/);
    await this.expectToBeVisible(this.heading());
    await this.expectToBeVisible(this.profileTab());
    await expect(this.profileTab()).toHaveAttribute("aria-selected", "true");
    await this.expectToBeVisible(this.embedTab());
    await expect(this.page.getByText(email).first()).toBeVisible();
    await this.expectToBeVisible(this.nameInput());
    await this.expectToBeVisible(this.descriptionInput());
    await this.expectToBeVisible(this.websiteInput());
    await this.expectToBeVisible(this.organizationTypeControl());
    await this.expectToBeVisible(this.currentPasswordInput());
    await this.expectToBeVisible(this.newPasswordInput());
    await this.expectToBeVisible(this.confirmNewPasswordInput());
    await expect(
      this.page.getByText(
        "If you do not need to change your password leave these three password fields empty.",
      ),
    ).toBeVisible();
    await this.expectToBeVisible(this.saveButton());
  }

  async getProfileDetails(): Promise<ProfileDetails> {
    return {
      name: await this.nameInput().inputValue(),
      description: await this.descriptionInput().inputValue(),
      website: await this.websiteInput().inputValue(),
    };
  }

  async fillProfile({ description, website }: Pick<ProfileDetails, "description" | "website">) {
    await this.descriptionInput().fill(description);
    await this.websiteInput().fill(website);
  }

  async saveProfile() {
    const saveResponse = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/user-profile/") &&
        resp.request().method() === "PUT" &&
        resp.status() === 200,
    );
    await this.saveButton().click();
    await saveResponse;
  }

  async expectUpdatedProfileToast() {
    await expect(this.updatedProfileToast()).toBeVisible();
  }

  async expectProfileDetails(details: ProfileDetails) {
    await expect(this.nameInput()).toHaveValue(details.name);
    await expect(this.descriptionInput()).toHaveValue(details.description);
    await expect(this.websiteInput()).toHaveValue(details.website);
  }

  async expectApiTabVisible() {
    await this.expectToBeVisible(this.apiTab());
  }

  async expectApiTabHidden() {
    await expect(this.apiTab()).toHaveCount(0);
  }

  async openApiTab() {
    await this.apiTab().click();
    await expect(this.apiTab()).toHaveAttribute("aria-selected", "true");
  }

  async expectTokenLimitInfo() {
    await expect(this.page.getByText("Token:")).toBeVisible();
    await expect(this.page.getByText("Call Limit:")).toBeVisible();
    await expect(this.page.getByText("Current Usage:")).toBeVisible();
    await expect(this.page.getByText("Renewal Period:")).toBeVisible();
  }

  async expectCookiePreferences() {
    await this.expectToBeVisible(this.cookiePreferencesHeading());
    await expect(
      this.page.getByText(/We use cookies to give you the best experience on Open Supply Hub/i),
    ).toBeVisible();
  }

  async rejectCookiePreferences() {
    await expect(this.cookieRejectButton()).toBeVisible();
    await this.cookieRejectButton().click();
  }

  async acceptCookiePreferences() {
    await this.cookieAcceptButton().click();
  }

  async expectCookieAcceptVisible() {
    await expect(this.cookieAcceptButton()).toBeVisible();
  }
}
