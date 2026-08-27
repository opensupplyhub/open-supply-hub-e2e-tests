import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { MainPage } from "./pages/MainPage";

test.beforeAll(setup);

const GUEST_LANGUAGES = [
  { label: "বাংলা", href: "https://info.opensupplyhub.org/bangladesh" },
  { label: "简体中文", href: "https://info.opensupplyhub.org/facilities-chinese" },
  { label: "India", href: "https://info.opensupplyhub.org/india" },
  { label: "Português", href: "https://info.opensupplyhub.org/brasil" },
  { label: "Türkçe", href: "https://info.opensupplyhub.org/turkey" },
] as const;

test.describe("[@regression] Guest users", () => {
  test("[@regression] OSDEV-1255: Guest users can switch languages via the Language menu", async ({
    page,
  }) => {
    const { BASE_URL } = process.env;
    const mainPage = new MainPage(page, BASE_URL!);

    await mainPage.goTo();
    await mainPage.acceptCookiesIfPresent();

    await mainPage.expectLanguageButtonVisible();
    await mainPage.openLanguageMenu();
    await mainPage.expectLanguageOptions(GUEST_LANGUAGES);

    const bangla = GUEST_LANGUAGES[0];
    await Promise.all([
      page.waitForURL(bangla.href),
      mainPage.chooseLanguage(bangla.label),
    ]);
    await expect(page).toHaveURL(bangla.href);
  });
});
