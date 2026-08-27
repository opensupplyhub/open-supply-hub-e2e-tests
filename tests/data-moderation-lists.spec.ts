import { test, expect } from "@playwright/test";
import { setup, skipIfMutatingNotAllowed } from "./utils/env";
import { loginViaAuthPage } from "./utils/dashboard";
import { ContributorListsPage } from "./pages/ContributorListsPage";
import { FacilityListsApi } from "./utils/api";

test.beforeAll(setup);

test.describe("[@regression] Contributor Lists approve/reject", () => {
  test.beforeEach(() => {
    skipIfMutatingNotAllowed(test);
  });

  test("[@regression] OSDEV-1294: Approve a Pending contributor list (Total > 0)", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const listsPage = new ContributorListsPage(page, BASE_URL!);
    await listsPage.goToLists();
    await listsPage.expectListsPage();
    const pendingLists = await new FacilityListsApi(page).pending(50);
    const list =
      pendingLists.find(
        (item) => (item.item_count ?? item.facility_count ?? 0) > 0,
      ) ?? null;
    test.skip(!list, "No PENDING contributor list with Total > 0");
    await listsPage.openListById(list!.id);
    await listsPage.expectListStatus("PENDING");
    await listsPage.approveList();
    await listsPage.expectListStatus("APPROVED");
  });

  test("[@regression] OSDEV-1285: Reject a Pending contributor list (Total > 0)", async ({
    page,
  }) => {
    const { BASE_URL, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD } = process.env;
    await loginViaAuthPage(page, USER_ADMIN_EMAIL!, USER_ADMIN_PASSWORD!);
    const listsPage = new ContributorListsPage(page, BASE_URL!);
    await listsPage.goToLists();
    await listsPage.expectListsPage();
    const pendingLists = await new FacilityListsApi(page).pending(50);
    const list =
      pendingLists.find(
        (item) => (item.item_count ?? item.facility_count ?? 0) > 0,
      ) ?? null;
    test.skip(!list, "No PENDING contributor list with Total > 0");
    await listsPage.openListById(list!.id);
    await listsPage.expectListStatus("PENDING");
    await listsPage.rejectList("QA reject list OSDEV-1285");
    await expect(
      page.getByText(/REJECTED|Feedback Phase|feedback phase/i).first(),
    ).toBeVisible({ timeout: 30000 });
  });
});
