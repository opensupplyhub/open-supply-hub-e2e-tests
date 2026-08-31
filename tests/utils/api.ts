import { APIRequestContext, APIResponse, Page, expect } from "@playwright/test";

export interface Options {
  authenticate?: boolean;
  params?:
    | { [key: string]: string | number | boolean }
    | URLSearchParams
    | string;
  token?: string;
  data?: unknown;
}

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
  facility_count?: number;
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
    has_approved_claim?: boolean;
    is_closed?: boolean;
    number_of_public_contributors?: number;
  };
};

export type FacilityActivityReport = {
  id: number;
  facility: string;
  facility_name?: string;
  status: string;
  closure_state: string;
};

export type ProductionLocation = {
  os_id: string;
  name: string;
  address?: string;
  country?: { alpha_2?: string; name?: string } | string;
  coordinates?: { lat: number; lng: number };
};

export type SplitMatch = {
  match_id?: number;
  name?: string;
  transferred_from?: string | null;
  is_active?: boolean;
};

function authorizationHeader(options: Options): Record<string, string> {
  const token =
    options.token ?? (options.authenticate ? process.env.AUTH_TOKEN : undefined);
  return token ? { Authorization: `Token ${token}` } : {};
}

async function send(
  request: APIRequestContext,
  method: "get" | "post",
  url: string,
  options: Options = {},
): Promise<APIResponse> {
  const { BASE_URL } = process.env;
  return request[method](`${BASE_URL}${url}`, {
    headers: {
      ...authorizationHeader(options),
      ...(options.data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    params: options.params,
    data: options.data,
  });
}

export function get(
  request: APIRequestContext,
  url: string,
  options: Options = {},
): Promise<APIResponse> {
  return send(request, "get", url, options);
}

export function post(
  request: APIRequestContext,
  url: string,
  options: Options = {},
): Promise<APIResponse> {
  return send(request, "post", url, options);
}

async function expectOk(response: APIResponse, context: string) {
  const status = response.status();
  if (status < 200 || status >= 300) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context} failed: HTTP ${status} ${body.slice(0, 400)}`);
  }
}

function asList<T>(body: unknown, keys: string[] = ["results", "data"]): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(rec[key])) {
        return rec[key] as T[];
      }
    }
  }
  return [];
}

class ApiClient {
  constructor(protected readonly page: Page) {}

  protected fetch(url: string, options: Options = {}) {
    return get(this.page.request, url, options);
  }

  protected async json<T>(
    url: string,
    options: Options = {},
    label = `GET ${url}`,
  ): Promise<T> {
    const response = await this.fetch(url, options);
    await expectOk(response, label);
    return response.json() as Promise<T>;
  }

  protected async jsonList<T>(
    url: string,
    options: Options = {},
    label?: string,
    keys?: string[],
  ): Promise<T[]> {
    return asList<T>(await this.json(url, options, label), keys);
  }
}

export class FacilityClaimsApi extends ApiClient {
  async pending(pageSize = 20) {
    return this.list({ statuses: "PENDING", pageSize });
  }

  async byStatus(statusFilter: string, pageSize = 20) {
    return this.list({ statuses: statusFilter, pageSize });
  }

  static osId(claim: {
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

  private list(params: Record<string, string | number>) {
    return this.jsonList<FacilityClaimSummary>(
      "/api/facility-claims/",
      { params },
      "GET facility-claims",
    );
  }
}

export class FacilityListsApi extends ApiClient {
  async pending(pageSize = 50) {
    const admin = await this.fetch("/api/admin-facility-lists/", {
      params: { status: "PENDING", pageSize },
    });
    if (admin.ok()) {
      return asList<FacilityListSummary>(await admin.json());
    }
    return this.jsonList<FacilityListSummary>(
      "/api/facility-lists/",
      { params: { status: "PENDING", pageSize } },
      "GET facility-lists",
    );
  }
}

export class FacilitiesApi extends ApiClient {
  async getByOsId(osId: string, token?: string): Promise<APIResponse> {
    return this.fetch(`/api/facilities/${osId}/`, {
      authenticate: Boolean(token),
      token,
    });
  }

  async byCountry(country: string, pageSize = 50) {
    const { features } = await this.list({
      countries: country,
      number_of_public_contributors: true,
      pageSize,
      sort_by: "contributors_desc",
    });
    return features;
  }

  async withOneContributor() {
    const feature = await this.findWithContributorCount(1);
    return { osId: feature.id, name: feature.properties?.name ?? "" };
  }

  async totalCount(): Promise<number> {
    const { count } = await this.list(
      { pageSize: 1, number_of_public_contributors: true },
      process.env.AUTH_TOKEN,
    );
    return count;
  }

  async withApprovedClaim(pageSize = 50) {
    const { features } = await this.list(
      { pageSize, sort_by: "contributors_desc" },
      process.env.AUTH_TOKEN,
    );
    const match = features.find((feature) => feature.properties?.has_approved_claim);
    expect(match, "No facility with an approved claim in search results").toBeTruthy();
    return match!;
  }

  async unclaimedOpen(pageSize = 50) {
    const { features } = await this.list(
      { pageSize, sort_by: "contributors_desc" },
      process.env.AUTH_TOKEN,
    );
    const match = features.find(
      (feature) =>
        !feature.properties?.has_approved_claim && !feature.properties?.is_closed,
    );
    expect(match, "No unclaimed open facility in search results").toBeTruthy();
    return match!;
  }

  async closedOsId() {
    const reports = await this.jsonList<FacilityActivityReport>(
      "/api/facility-activity-reports/",
      { authenticate: true },
      "GET facility-activity-reports",
    );
    for (const report of reports) {
      if (report.status !== "CONFIRMED" || report.closure_state !== "CLOSED") {
        continue;
      }
      const response = await this.getByOsId(report.facility, process.env.AUTH_TOKEN);
      if (!response.ok()) {
        continue;
      }
      const body = (await response.json()) as {
        properties?: { is_closed?: boolean | null };
      };
      if (body.properties?.is_closed) {
        return report.facility;
      }
    }
    throw new Error("No confirmed closed facility available");
  }

  async withDifferingMatchName(countries: string[]) {
    for (const country of countries) {
      const facilities = await this.byCountry(country, 50);
      for (const facility of facilities) {
        const canonicalName = facility.properties?.name?.trim() ?? "";
        if (!canonicalName) {
          continue;
        }
        const match = (await this.splitMatches(facility.id)).find(
          (item) =>
            item.name &&
            item.name.trim().toLowerCase() !== canonicalName.toLowerCase(),
        );
        if (match?.name) {
          return {
            osId: facility.id,
            canonicalName,
            matchName: match.name,
          };
        }
      }
    }
    return null;
  }

  static fromSplitBody(body: {
    properties?: { matches?: SplitMatch[] };
  } | null): SplitMatch[] {
    return body?.properties?.matches ?? [];
  }

  async splitMatches(osId: string): Promise<SplitMatch[]> {
    const result = await this.page.evaluate(
      async ({ id, ts }) => {
        const cookieMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        const csrf = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
        const response = await fetch(`/api/facilities/${id}/split/?_=${ts}`, {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            ...(csrf ? { "X-CSRFToken": csrf } : {}),
          },
        });
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        return { ok: response.ok, status: response.status, body };
      },
      { id: osId, ts: Date.now() },
    );

    if (!result.ok) {
      throw new Error(
        `GET /api/facilities/${osId}/split/ failed: HTTP ${result.status}`,
      );
    }
    return FacilitiesApi.fromSplitBody(
      result.body as { properties?: { matches?: SplitMatch[] } } | null,
    );
  }

  private async list(
    params: Record<string, string | number | boolean> = {},
    token?: string,
  ): Promise<{ count: number; features: FacilityFeature[] }> {
    const body = await this.json<{ count?: number; features?: FacilityFeature[] }>(
      "/api/facilities/",
      { authenticate: Boolean(token), token, params },
      "GET facilities",
    );
    return {
      count: body.count ?? (body.features?.length ?? 0),
      features: body.features ?? [],
    };
  }

  private async findWithContributorCount(count: number): Promise<FacilityFeature> {
    const query = {
      number_of_public_contributors: true,
      pageSize: 100,
      sort_by: "contributors_asc",
    };
    const matches = (feature: FacilityFeature) => {
      const n =
        feature.properties?.number_of_public_contributors ??
        (Array.isArray(feature.properties?.contributors)
          ? feature.properties.contributors.length
          : undefined);
      return n === count;
    };

    for (const country of ["ME", "IS", "AL", "BA", "MK"]) {
      const { features } = await this.list({ ...query, countries: country });
      const match = features.find(matches);
      if (match) {
        return match;
      }
    }

    const { features } = await this.list(query);
    const match = features.find(matches);
    expect(match, `No facility with exactly ${count} public contributor(s)`).toBeTruthy();
    return match!;
  }
}

export class ProductionLocationsApi extends ApiClient {
  async byCountry(country: string, size = 5, token = process.env.AUTH_TOKEN!) {
    return this.jsonList<ProductionLocation>(
      "/api/v1/production-locations/",
      { authenticate: Boolean(token), token, params: { country, size } },
      "GET production-locations",
      ["data", "results"],
    );
  }

  /**
   * After delete, v1 detail / UI can lag (cache + OpenSearch).
   * Poll GET /api/v1/production-locations/{osId}/ for 404; if still present,
   * open /production-locations/{osId} and retry several times.
   */
  async expectGone(
    osId: string,
    { attempts = 10, delayMs = 3000 }: { attempts?: number; delayMs?: number } = {},
  ) {
    const { BASE_URL } = process.env;
    let lastStatus = 0;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      lastStatus = (await this.fetch(`/api/v1/production-locations/${osId}/`)).status();
      if (lastStatus === 404) {
        return;
      }

      const detailResponsePromise = this.page
        .waitForResponse(
          (resp) =>
            resp.url().includes(`/api/v1/production-locations/${osId}`) &&
            resp.request().method() === "GET",
          { timeout: 20000 },
        )
        .catch(() => null);

      await this.page.goto(`${BASE_URL}/production-locations/${osId}`);
      await this.page.waitForLoadState("domcontentloaded");

      if ((await detailResponsePromise)?.status() === 404) {
        return;
      }

      const notFoundVisible = await this.page
        .getByRole("heading", { name: /not found/i })
        .or(
          this.page.getByText(
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
        await this.page.waitForTimeout(delayMs);
      }
    }

    expect(
      lastStatus,
      `Expected GET /api/v1/production-locations/${osId}/ → 404 after ${attempts} attempts (cache/OpenSearch lag)`,
    ).toBe(404);
  }
}
