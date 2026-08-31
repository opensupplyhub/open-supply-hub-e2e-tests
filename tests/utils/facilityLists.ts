import fs from "fs";
import os from "os";
import path from "path";
import { expect, Page } from "@playwright/test";

const DEFAULT_CSV = "DO_NOT_APPROVE test release.csv";

export async function uploadFacilityList(
  page: Page,
  options: {
    fileName?: string;
    listName: string;
    description: string;
  },
): Promise<{ listId: number; fileName: string; listName: string }> {
  const { BASE_URL, VERSION_TAG = "v0.0.0" } = process.env;
  const fileName = options.fileName ?? DEFAULT_CSV;
  const listName = `${options.listName} ${VERSION_TAG}`;

  await page.goto(`${BASE_URL}/contribute/multiple-locations`);
  await page.waitForLoadState("domcontentloaded");

  const acceptCookies = page.getByRole("button", { name: /^accept$/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }

  const loginLink = page.getByRole("link", {
    name: "Log in to contribute to Open Supply Hub",
  });
  if (await loginLink.isVisible().catch(() => false)) {
    await loginLink.click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    const { USER_EMAIL, USER_PASSWORD } = process.env;
    await page.getByLabel("Email").fill(USER_EMAIL!);
    await page.getByRole("textbox", { name: "Password" }).fill(USER_PASSWORD!);
    await page.getByRole("button", { name: "Log In" }).click();
    await page.waitForLoadState("networkidle");
    if (!page.url().includes("/contribute/multiple-locations")) {
      await page.goto(`${BASE_URL}/contribute/multiple-locations`);
    }
  }

  await expect(page.getByRole("button", { name: "My Account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload" })).toBeVisible();

  const nameInput = page.getByLabel("Enter the name for this facility list");
  await nameInput.fill(listName);
  await expect(nameInput).toHaveValue(listName);

  const descriptionInput = page.getByLabel(
    "Enter a description of this facility list and include a timeframe for the list's validity",
  );
  await descriptionInput.fill(options.description);
  await expect(descriptionInput).toHaveValue(options.description);

  await page.getByRole("button", { name: /select facility list file/i }).click();

  const originalFilePath = path.resolve(__dirname, `../data/${fileName}`);
  const newFileName = `${path.parse(fileName).name} ${VERSION_TAG}${path.extname(fileName)}`;
  const tempFilePath = path.join(os.tmpdir(), newFileName);
  fs.copyFileSync(originalFilePath, tempFilePath);

  await page.locator("input[type='file']").setInputFiles(tempFilePath);
  await expect(page.getByText(new RegExp(newFileName, "i"))).toBeVisible();

  const submitButton = page.getByRole("button", { name: /submit/i });
  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  const response = await page.waitForResponse(
    (resp) => resp.url().includes("/api/facility-lists/") && resp.status() === 200,
  );
  fs.unlinkSync(tempFilePath);

  const data = (await response.json()) as { id: number };
  await expect(
    page.locator("h2", { hasText: "Thank you for submitting your list!" }),
  ).toBeVisible();

  return { listId: data.id, fileName: newFileName, listName };
}

export async function dismissListSubmittedDialog(page: Page) {
  const toMain = page.getByRole("button", { name: /go to the main page/i });
  if (await toMain.isVisible().catch(() => false)) {
    await toMain.click();
    await page.getByRole("button", { name: "My Account" }).waitFor({
      state: "visible",
      timeout: 30000,
    });
  }
}

export async function waitForListToAppear(
  page: Page,
  listId: number,
): Promise<void> {
  const { BASE_URL } = process.env;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `${BASE_URL}/api/facility-lists/${listId}/`,
        );
        const data = (await response.json()) as { statuses?: unknown[] };
        return data.statuses?.length ?? 0;
      },
      {
        message: "/facility-lists/id return statuses (parsed)",
        intervals: [30000],
        timeout: 1600000,
      },
    )
    .not.toBe(0);
}
