import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";

test.beforeAll(setup);

test("Smoke: Main page. Log-in with valid credentials", async ({ page }) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL!);

  const title = await page.title();
  expect(title).toBe("Open Supply Hub");

  // navigate to the login pages
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("link", { name: "Login/Register" }).click();

  // fill in login credentials
  const { USER_EMAIL, USER_PASSWORD } = process.env;
  await page.getByLabel("Email Address").fill(USER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("button", { name: "My Account" })).toBeVisible();
});
