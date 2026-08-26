import { APIRequestContext, APIResponse, Page, expect } from "@playwright/test";

export type FacilityClaimSummary = {
  id: number;
  status: string;
  os_id: string;
  facility_name: string;
  contributor_name?: string;
  facility_country_name?: string;
  facility_country_code?: string;
};

export type FacilityListSummary = {
  id: number;
  name: string;
  status?: string;
  item_count?: number;
};

export type FacilityFeature = {
  id: string;
  type?: string;
  geometry?: { type: string; coordinates: [number, number] };
  properties?: {
    name?: string;
    address?: string;
    country_code?: string;
    country_name?: string;
    contributors?: unknown[];
    claim_info?: unknown;
    is_claimed?: boolean;
    is_closed?: boolean;
    number_of_public_contributors?: number;
    new_os_id?: string | null;
  };
};

export type ProductionLocation = {
  os_id: string;
  name: string;
  address?: string;
  country?: { alpha_2?: string; name?: string } | string;
  coordinates?: { lat: number; lng: number };
};

export type ActivityReport = {
  id: number;
  facility: string;
  facility_name?: string;
  closure_state: string;
  status: string;
  reported_by_user?: string;
  reported_by_contributor?: string;
};

function authHeaders(token?: string): Record<string, string> {
  if (!token) {
    return {};
  }
  return { Authorization: `Token ${token}` };
}

async function expectOk(response: APIResponse, context: string) {
  const status = response.status();
  if (status < 200 || status >= 300) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context} failed: HTTP ${status} ${body.slice(0, 400)}`);
  }
}

export async function getFacilityClaims(
  request: APIRequestContext,
  baseUrl: string,
  params: Record<string, string | number> = {},
): Promise<FacilityClaimSummary[]> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const url = `${baseUrl}/api/facility-claims/?${search.toString()}`;
  const response = await request.get(url);
  await expectOk(response, "GET facility-claims");
  const body = await response.json();
  if (Array.isArray(body)) {
    return body;
  }
  return body.results ?? body.data ?? [];
}

export async function getFirstClaimByStatus(
  request: APIRequestContext,
  baseUrl: string,
  status: "PENDING" | "APPROVED" | "DENIED" | "REVOKED",
): Promise<FacilityClaimSummary> {
  const claims = await getFacilityClaims(request, baseUrl, {
    status,
    pageSize: 50,
  });
  expect(claims.length, `No ${status} facility claims available`).toBeGreaterThan(0);
  return claims[0];
}

export async function getFacilityLists(
  request: APIRequestContext,
  baseUrl: string,
  params: Record<string, string | number> = {},
): Promise<{ count: number; results: FacilityListSummary[] }> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const url = `${baseUrl}/api/facility-lists/?${search.toString()}`;
  const response = await request.get(url);
  await expectOk(response, "GET facility-lists");
  const body = await response.json();
  if (Array.isArray(body)) {
    return { count: body.length, results: body };
  }
  return {
    count: body.count ?? (body.results?.length ?? 0),
    results: body.results ?? body.data ?? [],
  };
}

export async function getPendingListWithItems(
  request: APIRequestContext,
  baseUrl: string,
): Promise<FacilityListSummary> {
  const { results } = await getFacilityLists(request, baseUrl, {
    status: "PENDING",
    pageSize: 100,
  });
  const candidate = results.find(
    (list) => (list.item_count ?? 0) > 0 || (list as { facilities?: number }).facilities,
  );
  // Prefer lists that expose item_count > 0; otherwise fall back to first PENDING.
  if (candidate) {
    return candidate;
  }
  expect(results.length, "No PENDING facility lists available").toBeGreaterThan(0);
  return results[0];
}

export async function getFacilities(
  request: APIRequestContext,
  baseUrl: string,
  params: Record<string, string | number | boolean> = {},
  token?: string,
): Promise<{ count: number; features: FacilityFeature[] }> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const url = `${baseUrl}/api/facilities/?${search.toString()}`;
  const response = await request.get(url, { headers: authHeaders(token) });
  await expectOk(response, "GET facilities");
  const body = await response.json();
  return {
    count: body.count ?? (body.features?.length ?? 0),
    features: body.features ?? [],
  };
}

export async function getFacilityByOsId(
  request: APIRequestContext,
  baseUrl: string,
  osId: string,
  token?: string,
): Promise<{ status: number; body: FacilityFeature | Record<string, unknown> | null }> {
  const response = await request.get(`${baseUrl}/api/facilities/${osId}/`, {
    headers: authHeaders(token),
  });
  if (response.status() === 404) {
    return { status: 404, body: null };
  }
  await expectOk(response, `GET facilities/${osId}`);
  return { status: response.status(), body: await response.json() };
}

export async function getProductionLocations(
  request: APIRequestContext,
  baseUrl: string,
  params: Record<string, string | number> = {},
  token?: string,
): Promise<ProductionLocation[]> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const url = `${baseUrl}/api/v1/production-locations/?${search.toString()}`;
  const response = await request.get(url, { headers: authHeaders(token) });
  await expectOk(response, "GET production-locations");
  const body = await response.json();
  return body.data ?? body.results ?? [];
}

export async function getFacilityMatches(
  request: APIRequestContext,
  baseUrl: string,
  osId: string,
): Promise<{ count: number; matches: Array<{ id: number; name?: string; address?: string }> }> {
  const response = await request.get(`${baseUrl}/api/facilities/${osId}/`);
  await expectOk(response, `GET facilities/${osId} for matches`);
  // Matches endpoint used by adjust page:
  const matchesResponse = await request.get(
    `${baseUrl}/api/facilities/${osId}/matches/`,
  );
  if (matchesResponse.ok()) {
    const matchesBody = await matchesResponse.json();
    const matches = Array.isArray(matchesBody)
      ? matchesBody
      : matchesBody.matches ?? matchesBody.results ?? [];
    return { count: matches.length, matches };
  }
  return { count: 0, matches: [] };
}

export async function findFacilityWithPublicContributorCount(
  request: APIRequestContext,
  baseUrl: string,
  contributorCount: number,
): Promise<FacilityFeature> {
  // Prefer countries that historically have single-contributor facilities (recorded steps used ME).
  for (const country of ["ME", "IS", "AL", "BA", "MK"]) {
    const { features } = await getFacilities(request, baseUrl, {
      countries: country,
      number_of_public_contributors: true,
      pageSize: 100,
      sort_by: "contributors_asc",
    });
    const match = features.find((feature) => {
      const count =
        feature.properties?.number_of_public_contributors ??
        (Array.isArray(feature.properties?.contributors)
          ? feature.properties!.contributors!.length
          : undefined);
      return count === contributorCount;
    });
    if (match) {
      return match;
    }
  }

  const { features } = await getFacilities(request, baseUrl, {
    number_of_public_contributors: true,
    pageSize: 100,
    sort_by: "contributors_asc",
  });
  const match = features.find((feature) => {
    const count =
      feature.properties?.number_of_public_contributors ??
      (Array.isArray(feature.properties?.contributors)
        ? feature.properties!.contributors!.length
        : undefined);
    return count === contributorCount;
  });
  expect(
    match,
    `No facility with exactly ${contributorCount} public contributor(s)`,
  ).toBeTruthy();
  return match!;
}

export async function findTwoMergeableFacilities(
  request: APIRequestContext,
  baseUrl: string,
  token?: string,
): Promise<[ProductionLocation, ProductionLocation]> {
  const locations = await getProductionLocations(
    request,
    baseUrl,
    { page: 1, pageSize: 20 },
    token,
  );
  expect(locations.length, "Need at least two production locations to merge").toBeGreaterThanOrEqual(
    2,
  );
  return [locations[0], locations[1]];
}

export async function getActivityReports(
  request: APIRequestContext,
  baseUrl: string,
): Promise<ActivityReport[]> {
  const response = await request.get(`${baseUrl}/api/facility-activity-reports/`);
  await expectOk(response, "GET facility-activity-reports");
  const body = await response.json();
  return Array.isArray(body) ? body : body.results ?? body.data ?? [];
}

export async function getPendingActivityReport(
  request: APIRequestContext,
  baseUrl: string,
  closureState: "CLOSED" | "OPEN",
): Promise<ActivityReport> {
  const reports = await getActivityReports(request, baseUrl);
  const pending = reports.find(
    (report) =>
      report.status === "PENDING" && report.closure_state === closureState,
  );
  expect(
    pending,
    `No PENDING ${closureState} activity reports available`,
  ).toBeTruthy();
  return pending!;
}

export async function postPublicFacilityCreate(
  request: APIRequestContext,
  baseUrl: string,
  token: string,
  payload: {
    country: string;
    name: string;
    address: string;
    [key: string]: unknown;
  },
): Promise<APIResponse> {
  return request.post(`${baseUrl}/api/facilities/?public=true&create=true`, {
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    data: payload,
  });
}

export async function createPotentialMatchFacility(
  request: APIRequestContext,
  baseUrl: string,
  token: string,
): Promise<{ response: APIResponse; body: Record<string, unknown>; seed: FacilityFeature }> {
  const { features } = await getFacilities(
    request,
    baseUrl,
    { pageSize: 20, sort_by: "contributors_desc" },
    token,
  );
  expect(features.length, "Need an existing facility to seed POTENTIAL_MATCH").toBeGreaterThan(
    0,
  );
  const seed = features[0];
  const props = seed.properties ?? {};
  const countryCode = (props.country_code || "US").toUpperCase();
  const address = props.address || "Unknown address";
  const name = `QA Potential Match ${Date.now()} ${props.name || "Facility"}`.slice(
    0,
    200,
  );

  const response = await postPublicFacilityCreate(request, baseUrl, token, {
    country: countryCode,
    name,
    address,
    test_custom_field: "e2e potential match",
  });
  const body = await response.json();
  return { response, body, seed };
}

export function randomReviewNote(prefix = "QA review note"): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";
  let suffix = "";
  while (suffix.length < 80) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix} ${suffix}`.slice(0, 100);
}

// --- Compatibility helpers used by data-moderation specs ---

export function claimOsId(claim: {
  os_id?: string;
  facility_id?: string;
  facility?: { id?: string; os_id?: string };
}): string | undefined {
  return (
    claim.os_id ||
    claim.facility_id ||
    claim.facility?.os_id ||
    claim.facility?.id
  );
}

export async function fetchPendingClaims(page: Page, pageSize = 20) {
  const { BASE_URL } = process.env;
  return getFacilityClaims(page.request, BASE_URL!, {
    statuses: "PENDING",
    pageSize,
  });
}

export async function fetchClaimsByStatus(
  page: Page,
  statusFilter: string,
  pageSize = 20,
) {
  const { BASE_URL } = process.env;
  return getFacilityClaims(page.request, BASE_URL!, {
    statuses: statusFilter,
    pageSize,
  });
}

export async function fetchPendingFacilityLists(page: Page, pageSize = 50) {
  const { BASE_URL } = process.env;
  // Prefer admin endpoint when available; fall back to facility-lists
  const adminUrl = `${BASE_URL}/api/admin-facility-lists/?status=PENDING&pageSize=${pageSize}`;
  const adminResponse = await page.request.get(adminUrl);
  if (adminResponse.ok()) {
    const body = await adminResponse.json();
    return (body.results ?? body.data ?? []) as Array<
      FacilityListSummary & { facility_count?: number }
    >;
  }
  const { results } = await getFacilityLists(page.request, BASE_URL!, {
    status: "PENDING",
    pageSize,
  });
  return results;
}

export async function createFacilityViaApi(
  request: APIRequestContext,
  payload: {
    country: string;
    name: string;
    address: string;
    [key: string]: string;
  },
) {
  const { BASE_URL, AUTH_TOKEN } = process.env;
  return postPublicFacilityCreate(request, BASE_URL!, AUTH_TOKEN!, payload);
}

export async function fetchProductionLocations(
  page: Page,
  country: string,
  size = 5,
  token = process.env.AUTH_TOKEN!,
) {
  const { BASE_URL } = process.env;
  return getProductionLocations(
    page.request,
    BASE_URL!,
    { country, size },
    token,
  );
}

export async function fetchFacilityByOsId(page: Page, osId: string) {
  const { BASE_URL } = process.env;
  return page.request.get(`${BASE_URL}/api/facilities/${osId}/`);
}

export async function fetchProductionLocationByOsId(page: Page, osId: string) {
  const { BASE_URL } = process.env;
  return page.request.get(
    `${BASE_URL}/api/v1/production-locations/${osId}/`,
  );
}

/**
 * After delete, v1 detail / UI can lag (cache + OpenSearch).
 * Poll GET /api/v1/production-locations/{osId}/ for 404; if still present,
 * open /production-locations/{osId} and retry several times.
 */
export async function expectProductionLocationGone(
  page: Page,
  osId: string,
  {
    attempts = 10,
    delayMs = 3000,
  }: { attempts?: number; delayMs?: number } = {},
) {
  const { BASE_URL } = process.env;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const api = await fetchProductionLocationByOsId(page, osId);
    lastStatus = api.status();
    if (lastStatus === 404) {
      return;
    }

    const detailResponsePromise = page
      .waitForResponse(
        (resp) =>
          resp.url().includes(`/api/v1/production-locations/${osId}`) &&
          resp.request().method() === "GET",
        { timeout: 20000 },
      )
      .catch(() => null);

    await page.goto(`${BASE_URL}/production-locations/${osId}`);
    await page.waitForLoadState("domcontentloaded");

    const detailResponse = await detailResponsePromise;
    if (detailResponse?.status() === 404) {
      return;
    }

    const notFoundVisible = await page
      .getByRole("heading", { name: /not found/i })
      .or(
        page.getByText(
          /production location not found|facility not found|does not exist|no longer available/i,
        ),
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (notFoundVisible) {
      return;
    }

    if (attempt < attempts) {
      await page.waitForTimeout(delayMs);
    }
  }

  expect(
    lastStatus,
    `Expected GET /api/v1/production-locations/${osId}/ → 404 after ${attempts} attempts (cache/OpenSearch lag)`,
  ).toBe(404);
}

export async function fetchFacilityWithOneContributor(page: Page) {
  const { BASE_URL } = process.env;
  const feature = await findFacilityWithPublicContributorCount(
    page.request,
    BASE_URL!,
    1,
  );
  return {
    osId: feature.id,
    name: feature.properties?.name ?? "",
  };
}

export async function fetchFacilitiesByCountry(
  page: Page,
  country: string,
  pageSize = 50,
) {
  const { BASE_URL } = process.env;
  const { features } = await getFacilities(page.request, BASE_URL!, {
    countries: country,
    number_of_public_contributors: true,
    pageSize,
    sort_by: "contributors_desc",
  });
  return features;
}

export type SplitMatch = {
  id: number;
  name?: string;
  address?: string;
  transferred_from?: string;
};

export function parseSplitMatches(body: unknown): SplitMatch[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const rec = body as Record<string, unknown>;
  const nested = rec.facility as { matches?: unknown } | undefined;
  const raw = rec.matches ?? rec.results ?? nested?.matches ?? rec.data;
  return Array.isArray(raw) ? (raw as SplitMatch[]) : [];
}

export async function fetchFacilitySplitMatches(page: Page, osId: string) {
  // Admin session + CSRF (token-only / bare fetch often returns matches: []).
  const result = await page.evaluate(async (id) => {
    const cookieMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    const csrf = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
    const response = await fetch(`/api/facilities/${id}/split/`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: response.ok, status: response.status, body };
  }, osId);

  if (!result.ok) {
    throw new Error(
      `GET /api/facilities/${osId}/split/ failed: HTTP ${result.status}`,
    );
  }
  return parseSplitMatches(result.body);
}

export async function fetchPendingReopeningReports(page: Page) {
  const { BASE_URL } = process.env;
  return getPendingActivityReport(page.request, BASE_URL!, "OPEN").catch(
    () => null,
  );
}

export async function fetchPendingClosureReports(page: Page) {
  const { BASE_URL } = process.env;
  return getPendingActivityReport(page.request, BASE_URL!, "CLOSED").catch(
    () => null,
  );
}
