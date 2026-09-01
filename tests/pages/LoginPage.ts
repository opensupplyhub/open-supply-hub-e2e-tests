import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { MAP_PATH } from "./MainPage";

export class LoginPage extends BasePage {
  // Locators
  private emailInput = () => this.page.getByLabel("Email Address");
  private passwordInput = () => this.page.getByLabel("Password", { exact: true });
  private adminEmailInput = () => this.page.getByLabel("Email");
  private adminPasswordInput = () => this.page.getByLabel("Password");
  private loginButton = () => this.page.getByRole("button", { name: "Log In" });
  private myAccountButton = () => this.page.getByRole("button", { name: "My Account" });
  private logoutButton = () => this.page.getByRole("button", { name: "Log Out" });
  private loginRegisterLink = () => this.page.getByRole("link", { name: "Login/Register" });
  private settingsLink = () => this.page.getByRole("link", { name: "Settings" });
  private myFacilitiesLink = () => this.page.getByRole("link", { name: "My Facilities" });
  private myListsLink = () => this.page.getByRole("link", { name: "My Lists" });
  private dashboardLink = () => this.page.locator("a.button--auth", { hasText: "Dashboard" });
  private forgotPasswordControl = () =>
    this.page.locator("div.link-underline.cursor", { hasText: "Forgot your password?" });
  private forgotPasswordDialog = () => this.page.getByRole("dialog");
  private resetEmailInput = () => this.forgotPasswordDialog().locator("#name");
  private sendInstructionsButton = () =>
    this.forgotPasswordDialog().getByRole("button", { name: "SEND ME INSTRUCTIONS" });
  private resetInstructionsToast = () =>
    this.page.getByText("Check your email for password reset instructions");

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  // Main page authentication methods
  async loginToMainPage(email: string, password: string) {
    await this.goTo(MAP_PATH);
    await this.acceptCookiesIfPresent();
    await this.openLoginFromHeader();
    await this.completeLoginForm(email, password);
    await this.expectSignedIn();
  }

  async loginViaAuthPage(email: string, password: string) {
    await this.goTo("/auth/login");
    await this.acceptCookiesIfPresent();
    await this.submitAuthLoginForm(email, password);
  }

  async expectGuestSignedOut() {
    await this.expectToBeVisible(this.loginRegisterLink());
    await expect(this.myAccountButton()).toHaveCount(0);
  }

  async expectLoginRequiredNotice(linkName: string, heading: string) {
    await expect(this.page.getByRole("heading", { name: heading })).toBeVisible();
    const notice = this.page.getByRole("link", { name: linkName });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute("href", "/auth/login");
  }

  async loginFromContributeLink(email: string, password: string) {
    await this.page
      .getByRole("link", { name: "Log in to contribute to Open Supply Hub" })
      .click();
    await this.submitAuthLoginForm(email, password);
  }

  async openLoginFromHeader() {
    await this.loginRegisterLink().click();
    await this.page.waitForURL("**/auth/login");
  }

  async expectLoginForm() {
    await this.expectToBeVisible(this.page.getByRole("heading", { name: "Log In" }));
    await this.expectToBeVisible(this.emailInput());
    await this.expectToBeVisible(this.passwordInput());
    await this.expectToBeVisible(this.loginButton());
    await this.expectToBeVisible(this.page.getByRole("link", { name: "Register", exact: true }));
    await this.expectToBeVisible(this.forgotPasswordControl());
  }

  async openForgotPasswordDialog() {
    await this.forgotPasswordControl().click();
    await this.expectForgotPasswordDialog();
  }

  async expectForgotPasswordDialog() {
    const dialog = this.forgotPasswordDialog();
    await this.expectToBeVisible(dialog.getByRole("heading", { name: "Forgot your password?" }));
    await expect(
      dialog.getByText(
        "To restore your password, please enter your email address here. We will send you instructions.",
      ),
    ).toBeVisible();
    await this.expectToBeVisible(this.resetEmailInput());
    await this.expectToBeVisible(dialog.getByRole("button", { name: "CANCEL" }));
    await this.expectToBeVisible(this.sendInstructionsButton());
  }

  async completePasswordResetRequest(email: string) {
    await this.resetEmailInput().fill(email);
    const resetResponse = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest-auth/password/reset/") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    const toastVisible = this.resetInstructionsToast().waitFor({ state: "visible" });
    await this.sendInstructionsButton().click();
    await Promise.all([resetResponse, toastVisible]);
  }

  async expectPasswordResetInstructionsSent() {
    await expect(this.forgotPasswordDialog()).toHaveCount(0);
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }

  async openRegisterFromLogin() {
    await this.page.getByRole("link", { name: "Register", exact: true }).click();
    await this.page.waitForURL("**/auth/register");
  }

  async expectSignedIn() {
    await this.expectToBeVisible(this.myAccountButton());
    await expect(this.loginRegisterLink()).toHaveCount(0);
  }

  async completeLoginForm(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    const loginResponse = this.page.waitForResponse(
      (resp) => resp.url().includes("/user-login/") && resp.status() === 200,
    );
    await this.loginButton().click();
    await loginResponse;
    await this.waitForLoadState();
  }

  private async submitAuthLoginForm(email: string, password: string) {
    await this.completeLoginForm(email, password);
    await this.expectSignedIn();
  }

  async logoutFromMainPage() {
    await this.myAccountButton().click();
    await this.expectToBeVisible(this.logoutButton());
    const logoutResponse = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/user-logout/") &&
        resp.request().method() === "POST" &&
        resp.status() === 204,
    );
    await this.logoutButton().click();
    await logoutResponse;
    await this.expectGuestSignedOut();
  }

  async openMyAccountMenu() {
    await this.myAccountButton().click();
    await this.settingsLink().waitFor({ state: "visible" });
  }

  async expectWebsiteAccountMenu() {
    await this.openMyAccountMenu();
    await expect(this.myFacilitiesLink()).toBeVisible();
    await expect(this.myFacilitiesLink()).toHaveAttribute("href", "/claimed");
    await expect(this.myListsLink()).toBeVisible();
    await expect(this.myListsLink()).toHaveAttribute("href", "/lists");
    await expect(this.settingsLink()).toBeVisible();
    await expect(this.settingsLink()).toHaveAttribute("href", "/settings");
    await expect(this.logoutButton()).toBeVisible();
    await expect(this.dashboardLink()).toHaveCount(0);
  }

  async openAccountLink(name: "My Facilities" | "My Lists" | "Settings") {
    await this.openMyAccountMenu();
    const links = {
      "My Facilities": this.myFacilitiesLink,
      "My Lists": this.myListsLink,
      Settings: this.settingsLink,
    } as const;
    await links[name]().click();
  }

  async openSettings() {
    await this.openAccountLink("Settings");
    await this.page.waitForURL("**/settings**");
  }

  async openMyFacilities() {
    await this.openAccountLink("My Facilities");
    await this.page.waitForURL("**/claimed**");
  }

  async openMyLists() {
    await this.openAccountLink("My Lists");
    await this.page.waitForURL("**/lists**");
  }

  async verifyMainPageLogin(email: string) {
    await this.openSettings();
    await expect(this.page.getByText(email).first()).toBeVisible();
  }

  // Admin panel authentication methods
  async loginToAdminPanel(email: string, password: string) {
    await this.goTo("/admin/");

    const title = await this.page.title();
    expect(title).toBe("Log in | Django site admin");
    await this.expectToBeVisible(this.page.getByText("Open Supply Hub Admin"));

    await this.adminEmailInput().fill(email);
    await this.adminPasswordInput().fill(password);
    await this.loginButton().click();

    await this.expectToBeVisible(this.page.getByRole("link", { name: "Open Supply Hub Admin" }));
    await this.expectToBeVisible(this.page.getByText("Site administration"));
    await this.expectToBeVisible(this.page.getByRole("button", { name: "Log out" }));
  }

  async logoutFromAdminPanel() {
    await this.page.getByRole("button", { name: "Log out" }).click();

    await expect(this.page.getByText("Log in again")).toBeVisible();
  }

  async verifyAdminPanelLogin(email: string) {
    await this.expectToBeVisible(this.page.getByText(`Welcome, ${email}`));
    await this.expectToBeVisible(this.page.getByRole("table", { name: "Api" }).getByRole("caption"));
    await this.expectToBeVisible(
      this.page.getByRole("table", { name: "Authentication and Authorization" }).getByRole("caption")
    );
    await this.expectToBeVisible(this.page.getByRole("table", { name: "django-waffle" }).getByRole("caption"));
    await this.expectToBeVisible(this.page.getByRole("heading", { name: "Recent actions" }));
  }

  // Utility methods
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.myAccountButton().waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async isAdminLoggedIn(): Promise<boolean> {
    try {
      await this.page.getByRole("link", { name: "Open Supply Hub Admin" }).waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}
