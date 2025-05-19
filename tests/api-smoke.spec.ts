import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import { validate } from "./utils/schema";
import {
  facilitiesSchema,
  facilitiesSchemaDetailsTrue,
} from "./schemas/facilities-schema";
import { unauthorizedSchema } from "./schemas/unauthorized-schema";
import { facilitiesDownloadsSchema } from "./schemas/facilities-downloads-schema";

test.beforeAll(setup);

test.describe("OSDEV-1233: Smoke Tests - API Facilities Search", () => {
  test.describe("Get list of facilities from `/facilities/` endpoint", () => {
    test("GET `/facilities/`", async ({ request }) => {
      const response = await get(request, "/api/facilities/", {
        authenticate: true,
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      validate(facilitiesSchema, body);
    });

    test("Get list of facilities from `/facilities/?details=true` endpoint`", async ({
      request,
    }) => {
      const response = await get(request, "/api/facilities/?detail=true", {
        authenticate: true,
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      validate(facilitiesSchemaDetailsTrue, body);
    });

    test("GET `/facilities/` unauthorized", async ({ request }) => {
      const response = await get(request, "/api/facilities/", {
        authenticate: false,
      });
      expect(response.status()).toBe(401);

      const body = await response.json();
      validate(unauthorizedSchema, body);
    });
  });

  test.describe("Get list of facilities from `/facilities/downloads` endpoint", () => {
    test("GET `/facilities-downloads/` unauthorized", async ({ request }) => {
      const response = await get(request, "/api/facilities-downloads/", {
        authenticate: false,
      });
      expect(response.status()).toBe(401);

      const body = await response.json();
      validate(unauthorizedSchema, body);
    });

    test("GET `/facilities-downloads/` authenticated", async ({ request }) => {
      const response = await get(request, "/api/facilities-downloads/", {
        authenticate: true,
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      validate(facilitiesDownloadsSchema, body);
    });
  });
});
