import { test, expect } from "@playwright/test";
import { setup } from "./utils/env";
import { get } from "./utils/api";
import { validateSchema } from "./utils/schemaValidator";
import { getFacilitiesSchema, getFacilitiesSchemaDetailsTrue } from "./schemas/getFacilities.schema";
import { unauthorizedSchema } from "./schemas/unauthorized.schema";
import { getFacilitiesDownloadsSchema } from "./schemas/getFacilitiesDownloads.schema";

test.beforeAll(setup);

test.describe("OSDEV-1233: Smoke Tests - API Facilities Search", () => {

  test.describe("Get list of facilities from `/facilities/` endpoint", () => {
    test("GET `/facilities/`", async ({ request }) => {
      const response = await get(request, "/api/facilities/", { authenticate: true });
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(getFacilitiesSchema, body);
    });

    test("Get list of facilities from `/facilities/?details=true` endpoint`", async ({ request }) => {
      const response = await get(request, "/api/facilities/?detail=true", { authenticate: true });
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(getFacilitiesSchemaDetailsTrue, body);
    });

    test("GET `/facilities/` unauthorized", async ({ request }) => {
      const response = await get(request, "/api/facilities/", { authenticate: false });
      expect(response.status()).toBe(401);
      const body = await response.json();
      validateSchema(unauthorizedSchema, body);
    });
  });

  test.describe("Get list of facilities from `/facilities/downloads` endpoint", () => {
    test("GET `/facilities-downloads/` unauthorized", async ({ request }) => {
      const response = await get(request, "/api/facilities-downloads/", { authenticate: false });
      expect(response.status()).toBe(401);
      const body = await response.json();
      validateSchema(unauthorizedSchema, body);
    });

    test("GET `/facilities-downloads/` authenticated", async ({ request }) => {
      const response = await get(request, "/api/facilities-downloads/", { authenticate: true });
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(getFacilitiesDownloadsSchema, body);
    });
  });

});


