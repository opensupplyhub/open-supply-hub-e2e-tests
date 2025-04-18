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

test("OSDEV-1235: Smoke: Django Admin Panel. Log-in with valid credentials", async ({
  page,
}) => {
  const { BASE_URL } = process.env;
  await page.goto(BASE_URL+"/admin/"!);

  // make sure that we are on the login page of Admin Dashboard
  const title = await page.title();
  expect(title).toBe("Log in | Django site admin");

  await expect(page.getByText("Open Supply Hub Admin")).toBeVisible();

  // fill in login credentials
  const { USER_EMAIL, USER_PASSWORD } = process.env;
  await page.getByLabel("Email").fill(USER_EMAIL!);
  await page.getByLabel("Password").fill(USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  
  await expect(page.getByText("Welcome, "+USER_EMAIL)).toBeVisible();

  // make sure that we have successfully logged in
  await expect(page.getByRole('link', { name: 'Open Supply Hub Admin' })).toBeVisible();
  await expect(page.getByText("Site administration")).toBeVisible();
  await expect(page.getByRole('table', { name: 'Api' }).getByRole('caption')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Authentication and Authorization' }).getByRole('caption')).toBeVisible();
  await expect(page.getByRole('table', { name: 'django-waffle' }).getByRole('caption')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log out' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent actions' })).toBeVisible();
  
  // log the user out and make sure we are logged out
  await page.getByRole('link', { name: 'Log out' }).click();
  await expect(page.getByText("Welcome, "+USER_EMAIL)).not.toBeVisible();
  await expect(page.getByText("Log in again")).toBeVisible();
});
