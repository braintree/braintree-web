import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Error handling and cancellation tests.
 *
 * Mocking strategy:
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Route interception is used for the mocked network error init test
 * - Cancellation: Tested via the backdrop cancel button
 * - Venmo auth: NOT automated (needs sandbox buyer credentials)
 */

test.describe("Venmo Error Handling - Desktop Web Login", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ venmoPage, page }) => {
    try {
      await venmoPage.closePopup();
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
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

test.describe("Venmo Error Handling - Network Errors", function () {
  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("[MOCKED] should show error on GraphQL network failure during init", async ({
    venmoPage,
    getTestUrl,
    page,
  }) => {
    await venmoPage.setupMocks("networkError");

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#result")).toHaveClass(/shared-result--error/, {
      timeout: 35000,
    });
    await expect(page.locator("#result")).toHaveClass(/shared-result--visible/);
    await expect(page.locator("#loading")).toBeHidden({ timeout: 35000 });
  });
});

/**
 * DEFERRED: QR Flow Error tests (CANCELED, EXPIRED, re-enable button after
 * QR error) removed — see desktop-qr.test.ts header comment for rationale.
 * Re-add once a real Venmo sandbox is available for end-to-end QR testing.
 */
