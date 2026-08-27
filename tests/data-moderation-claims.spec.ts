import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { loginViaAuthPage } from "./utils/dashboard";
import { FacilityClaimsPage } from "./pages/FacilityClaimsPage";
import { DeleteFacilityPage } from "./pages/DeleteFacilityPage";
import {
  FacilityClaimsApi,
  FacilitiesApi,
} from "./utils/api";

test.beforeAll(setup);

test.describe("[@regression] OSDEV-3203 / OSDEV-3204 Facility Claims filters and download", () => {
  test("[@regression] OSDEV-3203: Filter Facility Claims by status and/or country", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);

    let pendingCountryName = "";
    let pendingCountryCode = "";

    for (const status of ["PENDING", "APPROVED", "DENIED", "REVOKED"] as const) {
      await claimsPage.goToClaims(`/?statuses=${status}`);
      await claimsPage.expectClaimsPage();
      await claimsPage.expectRowsPresent();
      const statuses = await claimsPage.getStatusColumnValues(10);
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.every((value) => value === status)).toBe(true);

      if (status === "PENDING") {
        const osId = await claimsPage.getFirstRowOsId();
        expect(osId, "First PENDING Facility Name link must include an OS ID").toBeTruthy();
        const facilityResponse = await new FacilitiesApi(page).getByOsId(osId);
        expect(facilityResponse.status()).toBe(200);
        const facility = await facilityResponse.json();
        pendingCountryCode = (
          facility.properties?.country_code ||
          facility.country_code ||
          ""
        ).toUpperCase();
        pendingCountryName =
          facility.properties?.country_name ||
          facility.country_name ||
          (await claimsPage.getFirstRowCountry());
      }
    }

    expect(
      pendingCountryName && pendingCountryCode,
      "First PENDING row must provide a country for the combined filter",
    ).toBeTruthy();

    await claimsPage.goToClaims(
      `/?statuses=PENDING&countries=${pendingCountryCode}`,
    );
    await expect(page).toHaveURL(
      new RegExp(`countries=${pendingCountryCode}`),
      { timeout: 30000 },
    );
    await claimsPage.expectClaimsPage();
    await claimsPage.expectRowsPresent();
    const countries = await claimsPage.getCountryColumnValues(10);
    expect(countries.length).toBeGreaterThan(0);
    expect(
      countries.every((value) => value === pendingCountryName),
    ).toBe(true);
    const combinedStatuses = await claimsPage.getStatusColumnValues(10);
    expect(combinedStatuses.every((value) => value === "PENDING")).toBe(true);
  });

  test("[@regression] OSDEV-3204: Download Facility Claims as Excel", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.goToClaims("/?statuses=PENDING");
    await claimsPage.expectClaimsPage();

    const download = await claimsPage.downloadExcel();
    const downloadDir = path.resolve(__dirname, "downloads");
    fs.mkdirSync(downloadDir, { recursive: true });
    const filePath = path.join(downloadDir, download.suggestedFilename());
    await download.saveAs(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(path.basename(filePath)).toBe("facility_claims.xlsx");
  });
});

test.describe.serial("[@regression] Facility Claims mutating flows", () => {
  let claimIdForNote = 0;
  let claimIdToApprove = 0;
  let claimIdToDeny = 0;
  let approvedClaimId = 0;
  let approvedOsId = "";

  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-3202: Add a review note on a Facility Claim", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const pending = await new FacilityClaimsApi(page).pending(10);
    test.skip(pending.length < 1, "No PENDING claims available");
    claimIdForNote = pending[0].id;

    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.openClaimById(claimIdForNote);
    const note = `QA review note OSDEV-3202 ${Date.now()}`.slice(0, 100);
    await claimsPage.addReviewNote(note);
    await claimsPage.expectReviewNoteVisible(note);
  });

  test("[@regression] OSDEV-1288: Approve a Facility Claim", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const pending = await new FacilityClaimsApi(page).pending(20);
    test.skip(pending.length < 1, "No PENDING claims available");
    const claim = pending.find((c) => c.id !== claimIdForNote) ?? pending[0];
    claimIdToApprove = claim.id;
    approvedOsId = FacilityClaimsApi.osId(claim) || "";

    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.openClaimById(claimIdToApprove);
    await claimsPage.expectClaimStatus("PENDING");
    await claimsPage.approveClaim("QA approve OSDEV-1288");
    await claimsPage.expectClaimStatus("APPROVED");
    approvedClaimId = claimIdToApprove;

    if (approvedOsId) {
      await page.goto(`${BASE_URL}/production-locations/${approvedOsId}`);
      await expect(page.getByText(/CLAIMED PROFILE/i)).toBeVisible({
        timeout: 20000,
      });
    }
  });

  test("[@regression] OSDEV-1290: Revoke a Facility Claim", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    test.skip(!approvedClaimId, "No approved claim from OSDEV-1288");
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);

    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.openClaimById(approvedClaimId);
    await claimsPage.expectClaimStatus("APPROVED");
    await claimsPage.revokeClaim();
    await claimsPage.expectClaimStatus("REVOKED");

    if (approvedOsId) {
      const facilityResponse = await page.request.get(
        `${BASE_URL}/api/facilities/${approvedOsId}/`,
      );
      expect(facilityResponse.status()).toBe(200);
      const facilityBody = await facilityResponse.json();
      const hasApprovedClaim =
        Boolean(facilityBody.properties?.claim_info) ||
        Boolean(facilityBody.properties?.is_claimed);
      expect(hasApprovedClaim).toBe(false);
    }
  });

  test("[@regression] OSDEV-1289: Deny a Facility Claim", async ({ page }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const pending = await new FacilityClaimsApi(page).pending(20);
    test.skip(pending.length < 1, "No PENDING claims available");
    claimIdToDeny = pending[0].id;
    const osId = FacilityClaimsApi.osId(pending[0]) || "";

    const claimsPage = new FacilityClaimsPage(page, BASE_URL!);
    await claimsPage.openClaimById(claimIdToDeny);
    await claimsPage.denyClaim("QA deny OSDEV-1289");
    await claimsPage.expectClaimStatus("DENIED");

    if (osId) {
      const facilityResponse = await page.request.get(
        `${BASE_URL}/api/facilities/${osId}/`,
      );
      expect(facilityResponse.status()).toBe(200);
      const facilityBody = await facilityResponse.json();
      const hasApprovedClaim =
        Boolean(facilityBody.properties?.claim_info) ||
        Boolean(facilityBody.properties?.is_claimed);
      expect(hasApprovedClaim).toBe(false);
    }
  });
});

test.describe("[@regression] OSDEV-1292 Delete blocked for approved claim", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-1292: Delete Facility with approved claim is blocked", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const approved = await new FacilityClaimsApi(page).byStatus("APPROVED", 50);
    test.skip(approved.length < 1, "No APPROVED claims available");
    const resolvedOsId = FacilityClaimsApi.osId(approved[0]);
    test.skip(!resolvedOsId, "Approved claim missing OS ID");

    const deletePage = new DeleteFacilityPage(page, BASE_URL!);
    await deletePage.goToDeleteFacility();
    await deletePage.searchOsId(resolvedOsId!);
    await deletePage.clickDeleteFacility();
    await deletePage.confirmDelete();
    await deletePage.expectApprovedClaimBlockMessage();
  });
});
