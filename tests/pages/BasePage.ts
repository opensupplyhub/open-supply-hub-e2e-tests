import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  protected page: Page;
  protected baseUrl: string;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async goTo(path: string = "") {
    await this.page.goto(`${this.baseUrl}${path}`);
  }

  async waitForLoadState(state: "load" | "domcontentloaded" | "networkidle" = "networkidle") {
    await this.page.waitForLoadState(state);
  }

  async waitForResponse(urlPattern: string, status: number = 200) {
    await this.page.waitForResponse(
      (resp) => resp.url().includes(urlPattern) && resp.status() === status
    );
  }

  async clickButton(name: string) {
    await this.page.getByRole("button", { name }).click();
  }

  async clickLink(name: string) {
    await this.page.getByRole("link", { name }).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async expectToBeVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  async expectToHaveText(locator: Locator, text: string) {
    await expect(locator).toHaveText(text);
  }

  async expectToHaveValue(locator: Locator, value: string) {
    await expect(locator).toHaveValue(value);
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
} 