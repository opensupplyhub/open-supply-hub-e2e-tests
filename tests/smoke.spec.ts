import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";

test.beforeAll(setup);

test("OSDEV-1219: Smoke: Main page. Log-in with valid credentials", async ({
  page,
}) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL!);

  // make sure that we are on the main page
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

  // make sure that we have successfully logged in
  await page.getByRole("button", { name: "My Account" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await page.isVisible(`text=${USER_EMAIL}`);
  await page.getByRole("button", { name: "My Account" }).click();

  // log the user out and make sure we are logged out
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page.getByText("text=My Account")).not.toBeVisible();
  await page.waitForResponse(
    async (resp) => resp.url().includes("/user-logout/") && resp.status() == 204
  );
  await expect(page.getByText("Login/Register")).toBeVisible();
});

test("Not existing p-locationsearch", async ({ page }) => {
  await page.goto(baseURL);
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page
    .getByPlaceholder("e.g. ABC Textiles Limited")
    .fill("invalid ABRACADABRA");
  await page.getByRole("button", { name: "Find Facilities" }).click();
  await expect(page.getByText("No facilities matching this")).toBeVisible();
});

test("Existing p-location-searchest", async ({ page }) => {
  await page.goto("https://test.os-hub.net/");
  await page.getByPlaceholder("e.g. ABC Textiles Limited").click();
  await page
    .getByPlaceholder("e.g. ABC Textiles Limited")
    .fill("coffee factory");
  await page.getByRole("button", { name: "Find Facilities" }).click();
  await page.waitForTimeout(10000);
  await expect(page.getByText("# Contributors")).toBeVisible();
});
