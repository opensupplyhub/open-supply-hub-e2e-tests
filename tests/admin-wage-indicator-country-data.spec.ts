import { test, expect, Page } from "@playwright/test";
import { setup } from "./utils/env";
import { LoginPage } from "./pages/LoginPage";

test.beforeAll(setup);

const WAGE_COLUMN_HEADERS = [
  "Living wage link national",
  "Minimum wage link english",
  "Minimum wage link national",
] as const;


async function findColumnIndexByHeader(page: Page, headerSubstring: string): Promise<number> {
  return page.evaluate((label) => {
    const normalized = label.toLowerCase();
    const table = document.querySelector("#result_list");
    if (!table) return -1;
    const headerCells = [...table.querySelectorAll("thead th")];
    return headerCells.findIndex((th) =>
      (th.textContent || "").toLowerCase().includes(normalized)
    );
  }, headerSubstring);
}


async function collectLinksFromColumnByHeader(
  page: Page,
  baseUrl: string,
  headerLabel: string
): Promise<string[]> {
  const idx = await findColumnIndexByHeader(page, headerLabel);
  expect(idx, `Column "${headerLabel}" not found in #result_list`).toBeGreaterThanOrEqual(0);

  const hrefs = await page.evaluate(
    ({ columnIndex }: { columnIndex: number }) => {
      const table = document.querySelector("#result_list");
      if (!table) return [] as string[];
      const rows = [...table.querySelectorAll("tbody tr")];
      const out: string[] = [];
      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        const cell = cells[columnIndex];
        if (!cell) continue;
        for (const a of cell.querySelectorAll("a[href]")) {
          const href = a.getAttribute("href");
          if (href) out.push(href);
        }
      }
      return out;
    },
    { columnIndex: idx }
  );

  return [...new Set(hrefs.map((h) => new URL(h, baseUrl).href))];
}

type UrlCheckFailure = { url: string; detail: string };

function formatUrlFailures(failures: UrlCheckFailure[]): string {
  return failures.map((f) => `  ${f.url}\n    → ${f.detail}`).join("\n");
}


async function collectNon200Responses(
  page: Page,
  urls: string[],
  chunkSize = 15
): Promise<UrlCheckFailure[]> {
  const failures: UrlCheckFailure[] = [];

  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(async (url) => {
        try {
          const response = await page.request.get(url);
          const status = response.status();
          return { url, ok: status === 200, detail: `HTTP ${status}` };
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e);
          return { url, ok: false, detail };
        }
      })
    );

    for (const r of results) {
      if (!r.ok) {
        failures.push({ url: r.url, detail: r.detail });
      }
    }
  }

  return failures;
}

function assertNoBadUrls(failures: UrlCheckFailure[]): void {
  if (failures.length === 0) {
    return;
  }
  throw new Error(
    `Expected HTTP 200 for all links. Failed (${failures.length}):\n${formatUrlFailures(failures)}`
  );
}

async function loginAndOpenWageIndicatorList(page: Page, baseUrl: string): Promise<void> {
  const { USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
  const loginPage = new LoginPage(page, baseUrl);
  await loginPage.loginToAdminPanel(USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

  await page.goto(`${baseUrl}/admin/api/wageindicatorcountrydata/?all=`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#result_list")).toBeVisible();
}





test.describe("[@regression] Admin: Wage Indicator Country Data", () => {
  test("Wage column links (Living wage link national, Minimum wage link english, Minimum wage link national) return HTTP 200", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;

    await loginAndOpenWageIndicatorList(page, BASE_URL!);

    const hrefs = new Set<string>();
    for (const header of WAGE_COLUMN_HEADERS) {
      const columnUrls = await collectLinksFromColumnByHeader(page, BASE_URL!, header);
      for (const u of columnUrls) {
        hrefs.add(u);
      }
    }

    expect(
      hrefs.size,
      "Expected at least one link in the wage column cells to verify"
    ).toBeGreaterThan(0);

    const failures = await collectNon200Responses(page, [...hrefs]);
    assertNoBadUrls(failures);
  });
});
