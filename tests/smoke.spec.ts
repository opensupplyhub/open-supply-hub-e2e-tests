import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";

test.beforeAll(setup);

test("Smoke: Main page. Log-in with valid credentials", async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
});
