import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { loginAdminToModerationQueue } from "./utils/moderationQueue";
import { ContributionRecordPage } from "./pages/ContributionRecordPage";
import { fetchModerationEvents } from "./utils/moderationApi";

test.beforeAll(setup);

test.describe("[@regression] Contribution Record API integration", () => {
  test.setTimeout(3 * 60 * 1000);

  async function openPendingContributionRecord(
    page: import("@playwright/test").Page,
  ) {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const queue = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );

    await queue.goToModerationQueue();
    const pending = await fetchModerationEvents(page.request, BASE_URL!, {
      status: "PENDING",
      pageSize: 10,
    });
    test.skip(pending.data.length < 1, "No PENDING moderation events available");

    const moderationId = pending.data[0].moderation_id;
    const detailPagePromise = page.context().waitForEvent("page").catch(() => null);
    await page.goto(`${BASE_URL}/dashboard/moderation-queue/${moderationId}`);
    // Some builds open in same tab; others may popup — handle both.
    const popup = await detailPagePromise;
    const recordPage = popup && !popup.isClosed() ? popup : page;
    await recordPage.waitForLoadState("domcontentloaded");
    const record = new ContributionRecordPage(recordPage, BASE_URL!);
    await record.expectContributionRecord();
    return { queue, recordPage, record, moderationId };
  }

  test("[@regression] OSDEV-1594: Opening contribution record triggers GET moderation-events/{id}/", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    const queue = await loginAdminToModerationQueue(
      page,
      BASE_URL!,
      USER_ADMIN_EMAIL!,
      USER_ADMIN_PASSWORD!,
    );
    await queue.goToModerationQueue();

    const pending = await fetchModerationEvents(page.request, BASE_URL!, {
      status: "PENDING",
      pageSize: 5,
    });
    test.skip(pending.data.length < 1, "No PENDING moderation events available");
    const moderationId = pending.data[0].moderation_id;

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/v1/moderation-events/${moderationId}`) &&
        resp.request().method() === "GET",
      { timeout: 30000 },
    );
    await page.goto(`${BASE_URL}/dashboard/moderation-queue/${moderationId}`);
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const record = new ContributionRecordPage(page, BASE_URL!);
    await record.expectContributionRecord();
  });

  test("[@regression] OSDEV-1598: Potential Matches are loaded on contribution record", async ({
    page,
  }) => {
    const { record } = await openPendingContributionRecord(page);
    await record.expectPotentialMatchesSection();
  });

  test("[@regression] OSDEV-1599: Create new location from contribution record", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    const { recordPage, record } = await openPendingContributionRecord(page);

    const createBtn = recordPage.getByRole("button", {
      name: /create new location/i,
    });
    test.skip(
      !(await createBtn.isEnabled().catch(() => false)),
      "Create New Location not enabled",
    );

    const response = await record.createNewLocation();
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.os_id).toBeTruthy();
  });

  test("[@regression] OSDEV-1600: Reject contribution from contribution record", async ({
    page,
  }) => {
    skipIfMutatingNotAllowed(test);
    const { record } = await openPendingContributionRecord(page);
    const reason = `QA reject contribution OSDEV-1600 ${Date.now()}`.slice(0, 200);
    const patchResponse = await record.rejectContribution(reason);
    expect(patchResponse.status()).toBe(200);
    const body = await patchResponse.json();
    expect(body.status).toBe("REJECTED");
  });
});
