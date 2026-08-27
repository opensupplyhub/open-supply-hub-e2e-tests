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
  FacilitiesApi,
  ProductionLocationsApi,
} from "./utils/api";

test.beforeAll(setup);
test.setTimeout(10 * 60 * 1000);

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
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facility = await new FacilitiesApi(page).withOneContributor();

    const deletePage = new DeleteFacilityPage(page, BASE_URL!);
    await deletePage.goToDeleteFacility();
    await deletePage.searchOsId(facility.osId);
    await deletePage.clickDeleteFacility();
    if (await page.getByRole("button", { name: /delete facility/i }).last().isVisible()) {
      await deletePage.confirmDelete();
    }

    // Prefer v1 404; if lagging, open UI /production-locations/{osId} and retry
    await new ProductionLocationsApi(page).expectGone(facility.osId, {
      attempts: 10,
      delayMs: 3000,
    });
  });

  test("[@regression] OSDEV-3206: Cancel merge from confirmation dialog", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await new ProductionLocationsApi(page).byCountry("IS", 3);
    test.skip(locations.length < 2, "Need at least 2 Iceland locations");

    const mergePage = new MergeFacilitiesPage(page, BASE_URL!);
    await mergePage.goToMerge();
    await mergePage.searchTarget(locations[0].os_id);
    await mergePage.searchMergeInto(locations[1].os_id);
    await mergePage.clickMergeFacilities();
    await mergePage.cancelMerge();

    expect((await new FacilitiesApi(page).getByOsId(locations[0].os_id)).status()).toBe(200);
    expect((await new FacilitiesApi(page).getByOsId(locations[1].os_id)).status()).toBe(200);
  });

  test("[@regression] OSDEV-1295: Merge Two Facilities", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await new ProductionLocationsApi(page).byCountry("MX", 5);
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
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await new ProductionLocationsApi(page).byCountry("MX", 5);
    test.skip(locations.length < 2, "Need at least 2 Mexico locations");

    const mergePage = new MergeFacilitiesPage(page, BASE_URL!);
    await mergePage.goToMerge();
    await mergePage.searchTarget(locations[0].os_id);
    await mergePage.searchMergeInto(locations[1].os_id);
    await mergePage.flipFacilities();
    await mergePage.clickMergeFacilities();
    await mergePage.confirmMerge();
    await mergePage.expectMergedToast();
  });

  test("[@regression] OSDEV-1296: Transfer facility matches", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facilitiesApi = new FacilitiesApi(page);

    // Comment 36433: first two from MX contributors_desc.
    const facilities = await facilitiesApi.byCountry("MX", 50);
    expect(facilities.length).toBeGreaterThanOrEqual(2);
    const source = facilities[0];
    const alternate = facilities[1];

    const adjust = new AdjustFacilityMatchesPage(page, BASE_URL!);
    await adjust.goToAdjust();
    await adjust.expectPage();

    const sourceBefore = await adjust.searchOsId(source.id);
    expect(sourceBefore.length).toBeGreaterThan(3);
    const matchIndex = sourceBefore.findIndex((match) => !match.transferred_from);
    expect(
      matchIndex,
      "Need a source match that was not already transferred",
    ).toBeGreaterThanOrEqual(0);
    const matchToMove = sourceBefore[matchIndex];

    const destBefore = await facilitiesApi.splitMatches(alternate.id);

    await adjust.transferMatchAt(matchIndex, alternate.id);

    await expect
      .poll(async () => (await facilitiesApi.splitMatches(source.id)).length, {
        timeout: 60000,
        intervals: [2000, 3000, 5000],
      })
      .toBe(sourceBefore.length - 1);

    await expect
      .poll(
        async () => {
          const dest = await facilitiesApi.splitMatches(alternate.id);
          return dest.some((match) => match.match_id === matchToMove.match_id)
            ? dest.length
            : -1;
        },
        {
          timeout: 60000,
          intervals: [2000, 3000, 5000],
        },
      )
      .toBe(destBefore.length + 1);
  });

  test("[@regression] OSDEV-1296: Promote facility matches", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facilitiesApi = new FacilitiesApi(page);

    const source = await facilitiesApi.withDifferingMatchName(["AR", "MX"]);
    test.skip(
      !source,
      "Need a facility with a match whose Name differs from the canonical name",
    );

    const adjust = new AdjustFacilityMatchesPage(page, BASE_URL!);
    await adjust.goToAdjust();
    await adjust.expectPage();
    await adjust.searchOsId(source!.osId);

    const leftName = await adjust.leftPanelName();
    expect(leftName, "Left-side location name").toBeTruthy();

    const promotedName = await adjust.promoteFirstDifferingMatch(leftName);
    expect(
      promotedName,
      "Need a right-list match whose Name differs from the left-side location",
    ).toBeTruthy();

    await expect
      .poll(async () => (await adjust.leftPanelName()).trim().toLowerCase(), {
        timeout: 60000,
        intervals: [1000, 2000, 3000],
      })
      .toBe(promotedName.trim().toLowerCase());
  });

  test("[@regression] OSDEV-1297: Split a Facility on Adjust Facility Matches", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facilitiesApi = new FacilitiesApi(page);

    // Ticket data: first MX facility from contributors_desc. /split/ is only
    // for match counts on that OS ID (before/after), not to scan the list.
    const facilities = await facilitiesApi.byCountry("MX", 50);
    expect(facilities.length).toBeGreaterThanOrEqual(1);
    const source = facilities[0];
    const adjust = new AdjustFacilityMatchesPage(page, BASE_URL!);
    await adjust.goToAdjust();
    const matchesBefore = await adjust.searchOsId(source.id);
    await adjust.splitFirstMatch();

    await adjust.clearSearch();
    await adjust.searchOsId(source.id);
    await expect
      .poll(async () => (await facilitiesApi.splitMatches(source.id)).length, {
        timeout: 60000,
        intervals: [2000, 3000, 5000],
      })
      .toBe(matchesBefore.length - 1);
  });

  test("[@regression] OSDEV-1299: Update Facility Location coordinates", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const locations = await new ProductionLocationsApi(page).byCountry("US", 10);
    test.skip(locations.length < 1, "No US production locations");

    const newLng = "85";
    const newLat = "40";
    const updatePage = new UpdateFacilityLocationPage(page, BASE_URL!);
    await updatePage.goToUpdateLocation();
    await updatePage.expectPage();

    let updated = false;
    for (const location of locations) {
      await updatePage.searchOsId(location.os_id);
      if ((await updatePage.getPanelText()).includes(`${newLng}, ${newLat}`)) {
        continue;
      }
      await updatePage.setCoordinates(newLng, newLat);
      await updatePage.updateLocation();
      await updatePage.expectLeftPanelCoordinates(newLng, newLat);
      updated = true;
      break;
    }
    expect(updated, "left panel should contain 85, 40 after update").toBe(true);
  });
});

test.describe("[@regression] Status reports and Link OS ID", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-1301: View Status Reports and confirm a pending closure", async ({
    page,
  }) => {
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
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const reports = new StatusReportsPage(page, BASE_URL!);
    await reports.goToStatusReports();
    await reports.openClosuresTab();

    const osIds = await reports.collectOsIdsFromTable();
    expect(osIds.length, "Closures table must list facilities").toBeGreaterThan(
      0,
    );

    const facilitiesApi = new FacilitiesApi(page);
    const reopenReason = `QA report reopened ${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    let closedOsId: string | null = null;
    for (const osId of osIds) {
      const response = await facilitiesApi.getByOsId(osId);
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
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const facilitiesApi = new FacilitiesApi(page);

    let facilities = await facilitiesApi.byCountry("AR", 10);
    if (facilities.length < 2) {
      facilities = await facilitiesApi.byCountry("MX", 10);
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
