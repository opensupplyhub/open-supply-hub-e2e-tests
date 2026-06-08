import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { AdminPage } from "../pages/AdminPage";
import { LoginPage } from "../pages/LoginPage";

/** Multi-country filter yielding ~4800 results on test.os-hub.net */
export const FILTERED_FACILITIES_PATH =
  "/facilities/?countries=AL&countries=BA&countries=GR&countries=HR&countries=ME&sort_by=contributors_desc";

export const EMBED_CONTRIBUTOR_ID = "661";

export const EMBED_DOWNLOAD_RESULTS_LIMIT = 10000;

export const EMBEDDED_MAP_FIXTURE_PATH = path.resolve(
  __dirname,
  "../data/testEM-upto10000.html"
);

export const DEFAULT_FREE_DOWNLOAD_QUOTA = "5000";

export function getEmbedFacilitiesUrl(baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/facilities?contributors=${EMBED_CONTRIBUTOR_ID}&embed=1`;
}

export function loadEmbeddedMapFixtureHtml(baseUrl: string): string {
  const html = fs.readFileSync(EMBEDDED_MAP_FIXTURE_PATH, "utf-8");
  const embedUrl = getEmbedFacilitiesUrl(baseUrl);
  return html.replace(/<iframe([^>]*)\ssrc="[^"]*"/i, `<iframe$1 src="${embedUrl}"`);
}

/**
 * Sets free_download_records for the test user via Django admin (separate browser).
 */
export async function setUserFreeDownloadQuota(freeRecords: string): Promise<void> {
  const { BASE_URL, USER_EMAIL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  if (!BASE_URL || !USER_EMAIL || !USER_ADMIN_EMAIL || !USER_ADMIN_PASSWORD) {
    throw new Error("Missing env vars for download limit admin setup");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const loginPage = new LoginPage(page, BASE_URL);
  const adminPage = new AdminPage(page, BASE_URL);

  await loginPage.loginToAdminPanel(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD);
  await adminPage.setUserFreeDownloadQuota(USER_EMAIL, freeRecords);
  await browser.close();
}

export async function resetUserFreeDownloadQuota(): Promise<void> {
  await setUserFreeDownloadQuota(DEFAULT_FREE_DOWNLOAD_QUOTA);
}
