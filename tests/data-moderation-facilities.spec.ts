import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { loginViaAuthPage } from "./utils/dashboard";
import { DeleteFacilityPage } from "./pages/DeleteFacilityPage";
import { MergeFacilitiesPage } from "./pages/MergeFacilitiesPage";
import { AdjustFacilityMatchesPage } from "./pages/AdjustFacilityMatchesPage";
import { UpdateFacilityLocationPage } from "./pages/UpdateFacilityLocationPage";
import { LinkOsIdPage } from "./pages/LinkOsIdPage";
import { StatusReportsPage } from "./pages/StatusReportsPage";
import {
  fetchFacilityWithOneContributor,
  fetchProductionLocations,
  fetchFacilitiesByCountry,
  fetchFacilitySplitMatches,
  fetchFacilityByOsId,
  expectProductionLocationGone,
} from "./utils/dashboardApi";

test.beforeAll(setup);

async function reportClosureOrMove(
  page: import("@playwright/test").Page,
  baseUrl: string,
  osId: string,
  reason: string,
) {
  await page.goto(`${baseUrl}/production-locations/${osId}`);
  await page.waitForLoadState("domcontentloaded");

  const reportBtn = page
    .getByRole("button", { name: /report closure\s*\/\s*move|report a closure|report closure/i })
    .or(page.getByRole("link", { name: /report closure\s*\/\s*move|report a closure|report closure/i }))
    .first();
  await expect(reportBtn).toBeVisible({ timeout: 30000 });
  await reportBtn.click();

  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    const reasonField = dialog
      .locator("#dialog-text-field, #status-change-reason, textarea")
      .or(dialog.getByRole("textbox"))
      .first();
    await reasonField.fill(reason);
    await dialog.getByRole("button", { name: /^report$/i }).click();
  } else {
    await page.getByRole("textbox").last().fill(reason);
    await page.getByRole("button", { name: /^report$/i }).click();
  }
  await page.waitForTimeout(1500);
}

async function reportReopening(
  page: import("@playwright/test").Page,
  baseUrl: string,
  osId: string,
  reason: string,
) {
  await page.goto(`${baseUrl}/production-locations/${osId}`);
  await page.waitForLoadState("domcontentloaded");

  const reportBtn = page
    .getByRole("button", { name: /report reopened/i })
    .or(page.getByRole("link", { name: /report reopened/i }))
    .first();
  await expect(reportBtn).toBeVisible({ timeout: 30000 });
  await reportBtn.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await expect(
    dialog.getByText(/report production location reopened/i),
  ).toBeVisible();
  const reasonField = dialog
    .locator("#dialog-text-field, #status-change-reason, textarea")
    .or(dialog.getByRole("textbox"))
    .first();
  await reasonField.fill(reason);
  await dialog.getByRole("button", { name: /^report$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 30000 });
}

test.describe("[@regression] Delete / Merge / Adjust / Update facility tools", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-1293: Delete a Facility with only one contributor", async ({
    page,
  }) => {
    // Retries for cache / OpenSearch lag after delete
    test.setTimeout(6 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facility = await fetchFacilityWithOneContributor(page);

    const deletePage = new DeleteFacilityPage(page, BASE_URL!);
    await deletePage.goToDeleteFacility();
    await deletePage.searchOsId(facility.osId);
    await deletePage.clickDeleteFacility();
    if (await page.getByRole("button", { name: /delete facility/i }).last().isVisible()) {
      await deletePage.confirmDelete();
    }

    // Prefer v1 404; if lagging, open UI /production-locations/{osId} and retry
    await expectProductionLocationGone(page, facility.osId, {
      attempts: 10,
      delayMs: 3000,
    });
  });

  test("[@regression] OSDEV-3206: Cancel merge from confirmation dialog", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await fetchProductionLocations(page, "IS", 3);
    test.skip(locations.length < 2, "Need at least 2 Iceland locations");

    const mergePage = new MergeFacilitiesPage(page, BASE_URL!);
    await mergePage.goToMerge();
    await mergePage.searchTarget(locations[0].os_id);
    await mergePage.searchMergeInto(locations[1].os_id);
    await mergePage.clickMergeFacilities();
    await mergePage.cancelMerge();

    expect((await fetchFacilityByOsId(page, locations[0].os_id)).status()).toBe(200);
    expect((await fetchFacilityByOsId(page, locations[1].os_id)).status()).toBe(200);
  });

  test("[@regression] OSDEV-1295: Merge Two Facilities", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await fetchProductionLocations(page, "MX", 5);
    test.skip(locations.length < 2, "Need at least 2 Mexico locations");

    const target = locations[0].os_id;
    const mergeAway = locations[1].os_id;

    const mergePage = new MergeFacilitiesPage(page, BASE_URL!);
    await mergePage.goToMerge();
    await mergePage.searchTarget(target);
    await mergePage.searchMergeInto(mergeAway);
    await mergePage.clickMergeFacilities();
    await mergePage.confirmMerge();
    await mergePage.expectMergedToast();
  });

  test("[@regression] OSDEV-3205: Flip target and merge facilities before merging", async ({
    page,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await fetchProductionLocations(page, "SH", 5);
    test.skip(locations.length < 2, "Need at least 2 SH locations");

    const mergePage = new MergeFacilitiesPage(page, BASE_URL!);
    await mergePage.goToMerge();
    await mergePage.searchTarget(locations[0].os_id);
    await mergePage.searchMergeInto(locations[1].os_id);
    await mergePage.flipFacilities();
    await mergePage.clickMergeFacilities();
    await mergePage.confirmMerge();
    await mergePage.expectMergedToast();
  });

  test("[@regression] OSDEV-1296: Transfer and Promote facility matches", async ({
    page,
  }) => {
    test.setTimeout(5 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    // Comment 36433: first two from MX contributors_desc.
    const facilities = await fetchFacilitiesByCountry(page, "MX", 50);
    expect(facilities.length).toBeGreaterThanOrEqual(2);
    const source = facilities[0];
    const alternate = facilities[1];

    const adjust = new AdjustFacilityMatchesPage(page, BASE_URL!);
    await adjust.goToAdjust();
    await adjust.expectPage();

    const sourceBefore = await adjust.searchOsId(source.id);
    expect(
      sourceBefore.length,
      "Source facility must have more than 3 matches (GET .../split/ from Adjust search)",
    ).toBeGreaterThan(3);
    const alternateBefore = await fetchFacilitySplitMatches(page, alternate.id);

    await adjust.transferFirstMatchTo(alternate.id);

    await expect
      .poll(async () => (await fetchFacilitySplitMatches(page, source.id)).length, {
        timeout: 30000,
        intervals: [1000, 2000],
      })
      .toBe(sourceBefore.length - 1);

    const alternateAfter = await fetchFacilitySplitMatches(page, alternate.id);
    expect(alternateAfter.length).toBe(alternateBefore.length + 1);
    expect(
      alternateAfter.some((match) => match.transferred_from === source.id),
    ).toBe(true);

    await adjust.searchOsId(source.id);
    const leftName = (await adjust.leftPanelName()) || source.properties?.name || "";
    const afterTransfer = await fetchFacilitySplitMatches(page, source.id);
    const differing = afterTransfer.find(
      (match) =>
        (match.name || "").trim().toLowerCase() !== leftName.trim().toLowerCase(),
    );
    expect(
      differing?.name,
      "Need a match whose Name differs from the left-panel facility",
    ).toBeTruthy();

    const promoteResponse = await adjust.promoteMatchNamedDifferently(
      leftName,
      differing!.name,
    );
    const promoted = await promoteResponse.json();
    const promotedName =
      promoted.properties?.name || promoted.name || differing!.name;
    if (differing!.name) {
      expect(String(promotedName).toLowerCase()).toBe(
        differing!.name.trim().toLowerCase(),
      );
    }

    await adjust.searchOsId(source.id);
    await expect(page.getByText(differing!.name!, { exact: false }).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("[@regression] OSDEV-1297: Split a Facility on Adjust Facility Matches", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    // Ticket data: first MX facility from contributors_desc. /split/ is only
    // for match counts on that OS ID (before/after), not to scan the list.
    const facilities = await fetchFacilitiesByCountry(page, "MX", 50);
    expect(facilities.length).toBeGreaterThanOrEqual(1);
    const source = facilities[0];
    const adjust = new AdjustFacilityMatchesPage(page, BASE_URL!);
    await adjust.goToAdjust();
    const matchesBefore = await adjust.searchOsId(source.id);
    await adjust.splitFirstMatch();

    const after = await fetchFacilitySplitMatches(page, source.id);
    expect(after.length).toBe(matchesBefore.length - 1);
  });

  test("[@regression] OSDEV-1299: Update Facility Location coordinates", async ({
    page,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await fetchProductionLocations(page, "US", 3);
    test.skip(locations.length < 1, "No US production locations");
    const location = locations[0];
    const originalLat = location.coordinates?.lat;
    const originalLng = location.coordinates?.lng;

    const updatePage = new UpdateFacilityLocationPage(page, BASE_URL!);
    await updatePage.goToUpdateLocation();
    await updatePage.expectPage();
    await updatePage.searchOsId(location.os_id);
    await updatePage.setCoordinates("85", "40");
    await updatePage.updateLocation();

    // UI should reflect new coordinates on the left panel promptly.
    await expect(page.getByText(/85/).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/40/).first()).toBeVisible({ timeout: 30000 });

    let coordinates: [number, number] | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const facility = await fetchFacilityByOsId(page, location.os_id);
      expect(facility.status()).toBe(200);
      const body = await facility.json();
      coordinates = body.geometry?.coordinates ?? null;
      if (
        coordinates &&
        Math.abs(Number(coordinates[0]) - 85) < 0.0001 &&
        Math.abs(Number(coordinates[1]) - 40) < 0.0001
      ) {
        break;
      }
      await page.waitForTimeout(2000);
      // Re-apply once if first update did not stick.
      if (attempt === 3) {
        await updatePage.searchOsId(location.os_id);
        await updatePage.setCoordinates("85", "40");
        await updatePage.updateLocation();
      }
    }
    expect(Number(coordinates?.[0])).toBeCloseTo(85, 4);
    expect(Number(coordinates?.[1])).toBeCloseTo(40, 4);

    // Cleanup: restore original coordinates when known
    if (originalLat != null && originalLng != null) {
      await updatePage.searchOsId(location.os_id);
      await updatePage.setCoordinates(String(originalLng), String(originalLat));
      await updatePage.updateLocation();
    }
  });
});

test.describe("[@regression] Status reports and Link OS ID", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-1301: View Status Reports and confirm a pending closure", async ({
    page,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const reports = new StatusReportsPage(page, BASE_URL!);
    await reports.goToStatusReports();
    await reports.expectPage();
    await reports.openClosuresTab();
    await reports.confirmFirstPending("QA confirm closure OSDEV-1301");
    await expect(page.getByText(/CONFIRMED/i).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("[@regression] OSDEV-3209: Reject a Status Report with reason", async ({
    page,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const reports = new StatusReportsPage(page, BASE_URL!);
    await reports.goToStatusReports();
    await reports.expectPage();
    await reports.openClosuresTab();
    await reports.rejectFirstPending("QA reject status report — OSDEV-3209");
    await expect(page.getByText(/REJECTED/i).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("[@regression] OSDEV-3212: Confirm a facility reopening Status Report", async ({
    page,
  }) => {
    test.setTimeout(15 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const reports = new StatusReportsPage(page, BASE_URL!);
    await reports.goToStatusReports();
    await reports.openClosuresTab();

    const osIds = await reports.collectOsIdsFromTable();
    expect(osIds.length, "Closures table must list facilities").toBeGreaterThan(
      0,
    );

    const reopenReason = `QA report reopened ${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    let closedOsId: string | null = null;
    for (const osId of osIds) {
      const response = await fetchFacilityByOsId(page, osId);
      if (response.status() !== 200) {
        continue;
      }
      const body = await response.json();
      const isClosed = body.properties?.is_closed ?? body.is_closed;
      if (isClosed !== true) {
        continue;
      }
      try {
        await reportReopening(page, BASE_URL!, osId, reopenReason);
        closedOsId = osId;
        break;
      } catch {
        // Next closed row (already pending reopen, no Report Reopened, etc.)
      }
    }
    expect(
      closedOsId,
      "Need a closed Closures-table facility where Report Reopened is available",
    ).toBeTruthy();

    await reports.goToStatusReports();
    await reports.expectPage();
    await reports.openReopeningsTab();
    await reports.confirmPendingForOsId(
      closedOsId!,
      "QA confirm reopening status report — OSDEV-3212",
    );

    // Same check as Postman: GET /api/facilities/{osId}/ until properties.is_closed is false.
    const token = process.env.AUTH_TOKEN;
    await expect
      .poll(
        async () => {
          const response = await page.request.get(
            `${process.env.BASE_URL}/api/facilities/${closedOsId}/`,
            {
              headers: {
                ...(token ? { Authorization: `Token ${token}` } : {}),
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            },
          );
          if (response.status() !== 200) {
            return true;
          }
          const raw = await response.text();
          // Literal payload Postman shows: "is_closed": false (or null).
          if (/"is_closed"\s*:\s*(false|null)/.test(raw)) {
            return false;
          }
          const body = JSON.parse(raw) as {
            is_closed?: boolean | null;
            properties?: { is_closed?: boolean | null };
          };
          return body.properties?.is_closed === true;
        },
        {
          timeout: 5 * 60 * 1000,
          intervals: [2000, 3000, 5000],
        },
      )
      .toBe(false);
  });

  test("[@regression] OSDEV-1302: Link facility to New OS ID after closure confirm", async ({
    page,
  }) => {
    test.setTimeout(6 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    let facilities = await fetchFacilitiesByCountry(page, "AR", 10);
    if (facilities.length < 2) {
      facilities = await fetchFacilitiesByCountry(page, "MX", 10);
    }
    expect(
      facilities.length,
      "Need at least 2 facilities to close one and link to another",
    ).toBeGreaterThanOrEqual(2);

    const toClose = facilities[0];
    const linkTarget = facilities[1];

    await reportClosureOrMove(
      page,
      BASE_URL!,
      toClose.id,
      "QA closure for OSDEV-1302",
    );

    const reports = new StatusReportsPage(page, BASE_URL!);
    await reports.goToStatusReports();
    await reports.expectPage();
    await reports.openClosuresTab();
    await reports.expectConfirmActionAvailable();
    await reports.confirmFirstPending("QA confirm closure OSDEV-1302");

    const linkPage = new LinkOsIdPage(page, BASE_URL!);
    await linkPage.goToLinkId();
    await linkPage.expectPage();
    await linkPage.searchOldOsId(toClose.id);
    await linkPage.searchNewOsId(linkTarget.id);
    await linkPage.linkFacility();
    await expect(
      page.getByText(new RegExp(`Linked OS ID:.*${linkTarget.id}`, "i")),
    ).toBeVisible({ timeout: 30000 });
  });
});
