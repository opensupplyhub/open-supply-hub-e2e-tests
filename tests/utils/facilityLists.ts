import fs from "fs";
import os from "os";
import path from "path";
import { expect, Page } from "@playwright/test";
import { ContributeListPage } from "../pages/ContributeListPage";

const DEFAULT_CSV = "DO_NOT_APPROVE test release.csv";

function copyListFixture(fileName: string, versionTag: string) {
  const originalFilePath = path.resolve(__dirname, `../data/${fileName}`);
  const newFileName = `${path.parse(fileName).name} ${versionTag}${path.extname(fileName)}`;
  const tempFilePath = path.join(os.tmpdir(), newFileName);
  fs.copyFileSync(originalFilePath, tempFilePath);
  return { tempFilePath, newFileName };
}

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
  const { tempFilePath, newFileName } = copyListFixture(fileName, VERSION_TAG);
  const listPage = new ContributeListPage(page, BASE_URL!);

  try {
    const listId = await listPage.submitFacilityList({
      listName,
      description: options.description,
      filePath: tempFilePath,
      displayedFileName: newFileName,
    });
    return { listId, fileName: newFileName, listName };
  } finally {
    fs.unlinkSync(tempFilePath);
  }
}

export async function dismissListSubmittedDialog(page: Page) {
  const { BASE_URL } = process.env;
  await new ContributeListPage(page, BASE_URL!).dismissSubmittedDialog();
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

export async function waitForListItems(
  page: Page,
  listId: number,
): Promise<void> {
  const { BASE_URL } = process.env;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `${BASE_URL}/api/facility-lists/${listId}/items/?page=1&pageSize=20/`,
        );
        const data = (await response.json()) as { count?: number };
        return data.count ?? 0;
      },
      {
        message:
          "/facility-lists/id/items/?page=1&pageSize=20 return count of parsed facilities",
        intervals: [30000],
        timeout: 1600000,
      },
    )
    .not.toBe(0);
}
