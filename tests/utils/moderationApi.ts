import { APIRequestContext, Page, expect } from "@playwright/test";

export interface ModerationEventRecord {
  moderation_id: string;
  status: string;
  status_change_date: string | null;
  source: string;
  cleaned_data?: {
    name?: string;
    country?: { name?: string };
  };
}

export async function fetchModerationEvents(
  request: APIRequestContext,
  baseUrl: string,
  params: Record<string, string | number> = {},
): Promise<{ data: ModerationEventRecord[]; count: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  const url = `${baseUrl}/api/v1/moderation-events/${query ? `?${query}` : ""}`;
  const response = await request.get(url);

  expect(response.status()).toBe(200);
  const body = await response.json();
  return {
    data: body.data ?? [],
    count: body.count ?? 0,
  };
}

export async function patchModerationEventStatus(
  request: APIRequestContext,
  baseUrl: string,
  moderationId: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
  extra: Record<string, string> = {},
) {
  const response = await request.patch(
    `${baseUrl}/api/v1/moderation-events/${moderationId}/`,
    {
      data: { status, ...extra },
    },
  );

  return response;
}

export async function postModerationProductionLocation(
  request: APIRequestContext,
  baseUrl: string,
  moderationId: string,
) {
  return request.post(
    `${baseUrl}/api/v1/moderation-events/${moderationId}/production-locations/`,
    { data: {} },
  );
}

export async function patchModerationProductionLocation(
  request: APIRequestContext,
  baseUrl: string,
  moderationId: string,
  osId: string,
) {
  return request.patch(
    `${baseUrl}/api/v1/moderation-events/${moderationId}/production-locations/${osId}/`,
    { data: {} },
  );
}

export function createAuthenticatedRequest(page: Page): APIRequestContext {
  return page.request;
}
