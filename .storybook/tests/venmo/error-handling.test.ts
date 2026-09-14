import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest } from "../helpers/shared-waiters";

test.describe("Venmo Error Handling - Desktop Web Login", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ venmoPage, page }) => {
    await venmoPage.closePopup();
    await cleanupAfterTest(page);
  });

  test("should show error result with correct CSS classes on cancel", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();

    const result = await venmoPage.waitForResult();

    expect(result.error).toBe(true);
    expect(result.success).toBe(false);
  });

  test("should display user-friendly cancel message, not raw error code", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();

    const errorText = await venmoPage.waitForErrorResult();

    expect(errorText).toContain("canceled");
    expect(errorText).not.toContain("VENMO_CUSTOMER_CANCELED");
  });

  test("should re-enable button after any error", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();
    await venmoPage.waitForErrorResult();

    const button = page.locator("#venmo-button");

    await expect(button).toBeEnabled();
  });
});
