import { test, expect } from "@playwright/test";
import { config } from "dotenv";

test.beforeAll(async () => {
  config();
});

test("", async ({ page }) => {});
