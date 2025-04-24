import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";

test.beforeAll(setup);

test("OSDEV-1232: Facilities. Invalid search parameters",  async ({ page }) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL!);

  const invalidSearchQuery = "invalid ABRACADABRA";
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page
    .getByPlaceholder("e.g. ABC Textiles Limited")
    .fill(invalidSearchQuery); 
  
  await page.getByRole("button", { name: "Find Facilities" }).click();
  await page.waitForResponse(
    async (resp) => resp.url().includes(`api/facilities/?q=`) && resp.status() == 200
  );
  await expect(page.getByText("No facilities matching this")).toBeVisible();
});

test("OSDEV-1232: Facilities. Valid search parameters", async ({ page }) => {
  const { BASE_URL } = process.env;

  await page.goto(BASE_URL!);
   const validSearchQuery = "coffee factory";
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page
    .getByPlaceholder("e.g. ABC Textiles Limited")
    .fill(validSearchQuery);
  await page.getByRole("button", { name: "Find Facilities" }).click();
  await page.waitForResponse(
    async (resp) => resp.url().includes("api/facilities/?q=") && resp.status() == 200
  );
  await expect(page.getByText("# Contributors")).toBeVisible();
});


