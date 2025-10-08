import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

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
  private acceptButton = () => this.page.getByRole("button", { name: "Accept" });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  // Main page authentication methods
  async loginToMainPage(email: string, password: string) {
    await this.goTo();
    
    // Accept cookies if present
    try {
      await this.acceptButton().click();
    } catch (error) {
      console.log(`An error has happened during accepting cookies: ${error}`);
    }

    // Navigate to login
    await this.loginRegisterLink().click();
    
    // Fill credentials
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
    
    // Wait for successful login
    await this.expectToBeVisible(this.myAccountButton());
  }

  async completeLoginForm(email: string, password: string) {
    // Fill credentials
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
    
    await this.waitForLoadState();
    await this.page.waitForTimeout(2000);
  }

  async logoutFromMainPage() {
    await this.myAccountButton().click();
    await this.logoutButton().click();
    
    // Wait for logout response
    await this.waitForResponse("/user-logout/", 204);
    
    // Verify logout
    await expect(this.page.getByText("text=My Account")).not.toBeVisible();
    await this.expectToBeVisible(this.loginRegisterLink());
  }

  async verifyMainPageLogin(email: string) {
    await this.myAccountButton().click();
    await this.settingsLink().click();
    await this.page.isVisible(`text=${email}`);
    await this.myAccountButton().click();
  }

  // Admin panel authentication methods
  async loginToAdminPanel(email: string, password: string) {
    await this.goTo("/admin/");
    
    // Verify we're on admin login page
    const title = await this.page.title();
    expect(title).toBe("Log in | Django site admin");
    await this.expectToBeVisible(this.page.getByText("Open Supply Hub Admin"));
    
    // Fill admin credentials
    await this.adminEmailInput().fill(email);
    await this.adminPasswordInput().fill(password);
    await this.loginButton().click();
    
    // Verify successful admin login
    await this.expectToBeVisible(this.page.getByRole("link", { name: "Open Supply Hub Admin" }));
    await this.expectToBeVisible(this.page.getByText("Site administration"));
    await this.expectToBeVisible(this.page.getByRole("link", { name: "Log out" }));
  }

  async logoutFromAdminPanel() {
    await this.page.getByRole("link", { name: "Log out" }).click();
    
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