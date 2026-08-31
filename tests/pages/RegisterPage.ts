import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export const DEFAULT_ORG_TYPE =
  "Academic / Researcher / Journalist / Student";

export type SignUpDetails = {
  email: string;
  password: string;
  organizationName: string;
  organizationDescription: string;
  organizationType?: string;
};

export class RegisterPage extends BasePage {
  private emailInput = () => this.page.locator("#email");
  private organizationNameInput = () => this.page.locator("#name");
  private organizationDescriptionInput = () => this.page.locator("#description");
  private websiteInput = () => this.page.locator("#website");
  private passwordInput = () => this.page.locator("#password");
  private confirmPasswordInput = () => this.page.locator("#confirmPassword");
  private newsletterCheckbox = () => this.page.locator("#newsletter");
  private tosCheckbox = () => this.page.locator("#tos");
  private organizationTypeControl = () =>
    this.page.locator("p.form__select-input-container");
  private organizationTypeOption = (label: string) =>
    this.page.locator("div.form__select-input--selected", { hasText: label });
  private registerButton = () => this.page.getByRole("button", { name: "REGISTER" });
  private successHeading = () =>
    this.page.getByRole("heading", { name: "Registration was successful!" });
  private emailAlreadyExistsError = () =>
    this.page.getByRole("listitem").filter({
      hasText: "A user with that email already exists.",
    });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async expectRegisterForm() {
    await this.expectToBeVisible(this.page.getByRole("heading", { name: "Register" }));
    await this.expectToBeVisible(this.emailInput());
    await this.expectToBeVisible(this.organizationNameInput());
    await this.expectToBeVisible(this.organizationDescriptionInput());
    await this.expectToBeVisible(this.websiteInput());
    await this.expectToBeVisible(this.organizationTypeControl());
    await this.expectToBeVisible(this.passwordInput());
    await this.expectToBeVisible(this.confirmPasswordInput());
    await this.expectToBeVisible(this.newsletterCheckbox());
    await this.expectToBeVisible(this.tosCheckbox());
    await this.expectToBeVisible(this.registerButton());
    await this.expectToBeVisible(this.page.getByRole("link", { name: "Log In" }));
  }

  async selectOrganizationType(label: string = DEFAULT_ORG_TYPE) {
    await this.organizationTypeControl().click();
    await this.organizationTypeOption(label).click();
    await expect(this.organizationTypeControl()).toHaveText(label);
  }

  async fillSignUpForm({
    email,
    password,
    organizationName,
    organizationDescription,
    organizationType = DEFAULT_ORG_TYPE,
  }: SignUpDetails) {
    await this.emailInput().fill(email);
    await this.organizationNameInput().fill(organizationName);
    await this.organizationDescriptionInput().fill(organizationDescription);
    await this.selectOrganizationType(organizationType);
    await this.passwordInput().fill(password);
    await this.confirmPasswordInput().fill(password);
    await this.tosCheckbox().check();
  }

  async completeSignUp(details: SignUpDetails, expectStatus?: number) {
    await this.fillSignUpForm(details);

    const signupResponse = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/user-signup/") &&
        resp.request().method() === "POST" &&
        (expectStatus !== undefined ? resp.status() === expectStatus : resp.ok()),
    );
    await this.registerButton().click();
    await signupResponse;
  }

  async expectRegistrationSuccess() {
    await this.expectToBeVisible(this.successHeading());
    await expect(this.page.getByText(/Check your email for instructions about how to verify your account/i)).toBeVisible();
  }

  async expectEmailAlreadyExistsError() {
    await expect(this.page).toHaveURL(/\/auth\/register/);
    await this.expectToBeVisible(this.emailAlreadyExistsError());
    await expect(this.successHeading()).toHaveCount(0);
  }
}

export function uniqueSignupEmail(existingEmail: string): string {
  const at = existingEmail.indexOf("@");
  const local = existingEmail.slice(0, Math.max(at, 0)).replace(/\+.*/, "");
  const domain = existingEmail.slice(at + 1);
  return `${local}+signup-${Date.now()}@${domain}`;
}

/** Same address as `email`, with the local-part letter casing inverted. */
export function emailWithDifferentCasing(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) {
    throw new Error("emailWithDifferentCasing requires a local@domain email");
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const casedLocal =
    local === local.toUpperCase() ? local.toLowerCase() : local.toUpperCase();
  if (casedLocal === local) {
    throw new Error("Cannot derive a different letter-casing variant of the email");
  }
  return `${casedLocal}@${domain}`;
}
