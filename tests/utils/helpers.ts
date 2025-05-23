import path from "path";
import fs from "fs";
import { Page } from "@playwright/test";

export async function takeAndSaveScreenshot(fileName: string, page: Page) {
  const screenshotDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  const filePath = path.join(screenshotDir, `${fileName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
}