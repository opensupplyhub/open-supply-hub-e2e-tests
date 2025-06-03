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
import { claimStatuses } from "./schemas/claim-statuses-schema";
import { contributorTypes } from "./schemas/contributor-types-schema";
import { countries } from "./schemas/countries-schema";
import { facilitiesCount } from "./schemas/facilities-count-schema";
import { facilitiesById } from "./schemas/facilities-by-id-schema";
import { facilityProcessingTypes } from "./schemas/facility-processing-types-schema";
import { moderationEventsMerge } from "./schemas/moderation-events-merge-schema"; 
import { parentCompanies } from "./schemas/parent-companies-schema";
import { productTypes } from "./schemas/product-types-schema";
import { sectors } from "./schemas/sectors-schema";
import { workersRanges } from "./schemas/worker-ranges-schema";

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

// new part of the tests. coves get requests for https://opensupplyhub.org/api/docs/#!/facilities

test.describe("OpenSupplyHub Regression list", () => {
    test("GET `/claim-statuses/`", async ({ request }) => {
      const response = await get(request, "/api/claim-statuses/", {
        authenticate: true,
      });
        expect(response.status()).toBe(200);

        const body = await response.json();
  
        expect(body).toEqual(expect.arrayContaining(claimStatuses));
      });
    });


    test("401 GET `/claim-statuses/`", async ({ request }) => {
      const response = await get(request, "/api/claim-statuses/", {
        authenticate: false,
      });
  
      expect(response.status()).toBe(401);
  
      const body = await response.json();
      validate(unauthorizedSchema, body);
    });

    test("GET `/contributor-types/`", async ({ request }) => {
      const response = await get(request, "/api/contributor-types/", {
        authenticate: true,
      });
  
      expect(response.status()).toBe(200);
  
      const body = await response.json();
      expect(body).toEqual(expect.arrayContaining(contributorTypes));
    });
  
    test("401 GET `/contributor-types/`", async ({ request }) => {
      const response = await get(request, "/api/contributor-types/", {
        authenticate: false,
      });
  
      expect(response.status()).toBe(401);
  
      const body = await response.json();
      validate(unauthorizedSchema, body);
    });

    test("GET `/countries/`", async ({ request }) => {
      const response = await get(request, "/api/countries/", {
        authenticate: true,
      });
  
      expect(response.status()).toBe(200);
  
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
  
      // Check that expected countries are included
      for (const [code, name] of countries) {
        expect(body).toContainEqual([code, name]);
      }
    });
  
    test("401 GET `/countries/`", async ({ request }) => {
      const response = await get(request, "/api/countries/", {
        authenticate: false,
      });
  
      expect(response.status()).toBe(401);
  
      const body = await response.json();
      validate(unauthorizedSchema, body);
    });

    test("GET `/facilities/count/`", async ({ request }) => {
      const response = await get(request, "/api/facilities/count/", {
        authenticate: true,
      });
  
      expect(response.status()).toBe(200);
  
      const body = await response.json();
      validate(facilitiesCount, body);
    });
  
    test("401 GET `/facilities/count/`", async ({ request }) => {
      const response = await get(request, "/api/facilities/count/", {
        authenticate: false,
      });
  
      expect(response.status()).toBe(401);
  
      const body = await response.json();
      validate(unauthorizedSchema, body);
    });
  
    test("401 GET `/facilities/BD20190853EMPB5/`", async ({ request }) => {
      const response = await get(request, "/api/facilities/BD20190853EMPB5/", {
        authenticate: false,
      });
  
      expect(response.status()).toBe(401);
  
      const body = await response.json();
      validate(unauthorizedSchema, body);
    });

    test("GET `/facilities/{os_id}` using first result from `/facilities/`", async ({ request }) => {
  // Step 1: Get list of facilities
  const listResponse = await get(request, "/api/facilities/", {
    authenticate: true,
  });

  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.json();
  validate(facilitiesSchema, listBody); // optional, if schema exists

  // Step 2: Extract first os_id from features
  const firstFacility = listBody?.features?.[0];
  const osId = firstFacility?.properties?.os_id;

  expect(osId).toBeDefined();

  // Step 3: Call `/facilities/{os_id}/`
  const detailResponse = await get(request, `/api/facilities/${osId}/`, {
    authenticate: true,
  });

  expect(detailResponse.status()).toBe(200);

  const detailBody = await detailResponse.json();
  validate(facilitiesById, detailBody); // schema validation for detailed view
});

test("GET `/facility-processing-types/`", async ({ request }) => {
  const response = await get(request, "/api/facility-processing-types/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(facilityProcessingTypes, body);
});

test("401 GET `/facility-processing-types/`", async ({ request }) => {
  const response = await get(request, "/api/facility-processing-types/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});


test("GET `/moderation-events/merge/`", async ({ request }) => {
  const response = await get(request, "/api/moderation-events/merge/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(moderationEventsMerge, body);
});

test("401 GET `/moderation-events/merge/`", async ({ request }) => {
  const response = await get(request, "/api/moderation-events/merge/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});


test("GET `/parent-companies/`", async ({ request }) => {
  const response = await get(request, "/api/parent-companies/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(parentCompanies, body);
});

test("401 GET `/parent-companies/`", async ({ request }) => {
  const response = await get(request, "/api/parent-companies/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});


test("GET `/product-types/`", async ({ request }) => {
  const response = await get(request, "/api/product-types/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(productTypes, body);
});

test("401 GET `/product-types/`", async ({ request }) => {
  const response = await get(request, "/api/product-types/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});


test("GET `/sectors/`", async ({ request }) => {
  const response = await get(request, "/api/sectors/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(sectors, body);
});

test("401 GET `/sectors/`", async ({ request }) => {
  const response = await get(request, "/api/sectors/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});

test("GET `/workers-ranges/`", async ({ request }) => {
  const response = await get(request, "/api/workers-ranges/", {
    authenticate: true,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  validate(workersRanges, body);
});

test("401 GET `/workers-ranges/`", async ({ request }) => {
  const response = await get(request, "/api/workers-ranges/", {
    authenticate: false,
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  validate(unauthorizedSchema, body);
});