import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ContributeListPage extends BasePage {
  private heading = () => this.page.getByRole("heading", { name: "Upload" });
  private listNameInput = () =>
    this.page.getByLabel("Enter the name for this facility list");
  private listDescriptionInput = () =>
    this.page.getByLabel(
      "Enter a description of this facility list and include a timeframe for the list's validity",
    );
  private selectFileButton = () =>
    this.page.getByRole("button", { name: /select facility list file/i });
  private fileInput = () => this.page.locator("input[type='file']");
  private submitButton = () => this.page.getByRole("button", { name: /submit/i });
  private submittedHeading = () =>
    this.page.locator("h2", { hasText: "Thank you for submitting your list!" });
  private goToMainPageButton = () =>
    this.page.getByRole("button", { name: /go to the main page/i });
  private refreshButton = () =>
    this.page.getByRole("button", { name: /refresh/i });
  private fieldError = (message: string) =>
    this.page.locator(".form__field", { hasText: message });
  private myAccountButton = () =>
    this.page.getByRole("button", { name: "My Account" });

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async goToUploadForm() {
    await this.goTo("/contribute/multiple-locations");
    await this.acceptCookiesIfPresent();
  }

  async expectUploadForm() {
    await expect(this.page).toHaveURL(/\/contribute\/multiple-locations/);
    await this.expectToBeVisible(this.heading());
  }

  async submitFacilityList(options: {
    listName: string;
    description: string;
    filePath: string;
    displayedFileName: string;
  }): Promise<number> {
    await this.listNameInput().fill(options.listName);
    await expect(this.listNameInput()).toHaveValue(options.listName);

    await this.listDescriptionInput().fill(options.description);
    await expect(this.listDescriptionInput()).toHaveValue(options.description);

    await this.selectFileButton().click();
    await this.fileInput().setInputFiles(options.filePath);
    await expect(
      this.page.getByText(new RegExp(options.displayedFileName, "i")),
    ).toBeVisible();

    await this.submitButton().scrollIntoViewIfNeeded();
    await expect(this.submitButton()).toBeEnabled();
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/facility-lists/") && resp.status() === 200,
    );
    await this.submitButton().click();
    const response = await responsePromise;
    const data = (await response.json()) as { id: number };
    await this.expectSubmittedDialog();
    return data.id;
  }

  async clickSubmit() {
    await this.submitButton().scrollIntoViewIfNeeded();
    await this.submitButton().click();
  }

  async fillListName(listName: string) {
    await this.listNameInput().fill(listName);
    await expect(this.listNameInput()).toHaveValue(listName);
  }

  async expectFieldError(message: string) {
    await expect(this.fieldError(message)).toBeVisible();
  }

  async expectSubmittedDialog() {
    await expect(this.submittedHeading()).toBeVisible();
    await expect(this.goToMainPageButton()).toBeVisible();
    await expect(this.refreshButton()).toBeVisible();
  }

  async dismissSubmittedDialog() {
    if (await this.goToMainPageButton().isVisible().catch(() => false)) {
      await this.goToMainPageButton().click();
      await this.myAccountButton().waitFor({
        state: "visible",
        timeout: 30000,
      });
    }
  }
}
