import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Component lifecycle tests: initialization, teardown, reinitialization.
 *
 * Mocking strategy:
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Standard route interception
 * - Lifecycle operations: Called via page.evaluate on the window-exposed Venmo instance
 */

test.describe("Venmo Lifecycle - Desktop Web", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should initialize successfully (button visible)", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
  });

  test("should not show stale result from previous session after reload", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const isVisible = await venmoPage.isResultVisible();

    expect(isVisible).toBe(false);

    await page.reload({ waitUntil: "domcontentloaded" });

    await venmoPage.waitForStoryReady();

    const isVisibleAfterReload = await venmoPage.isResultVisible();

    expect(isVisibleAfterReload).toBe(false);
  });

  test("should maintain clean state after page reload", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    await page.reload({ waitUntil: "domcontentloaded" });

    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();

    const isLoading = await venmoPage.isLoadingVisible();

    expect(isLoading).toBe(false);
  });

  test("should teardown successfully", async ({ venmoPage, page }) => {
    await venmoPage.waitForVenmoButton();

    const result = await page.evaluate(async () => {
      const instance = window.__venmoInstance;

      if (!instance) throw new Error("Venmo instance not available");

      await instance.teardown();

      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test("should reject method calls after teardown", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      const instance = window.__venmoInstance;

      if (!instance) throw new Error("Venmo instance not available");

      await instance.teardown();

      try {
        await instance.tokenize();

        return null;
      } catch (err: any) {
        return { message: err.message, code: err.code };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.message).toContain("teardown");
  });

  test("should reject cancelTokenization when no tokenization is active", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      const instance = window.__venmoInstance;

      if (!instance) throw new Error("Venmo instance not available");

      try {
        await instance.cancelTokenization();

        return null;
      } catch (err: any) {
        return { code: err.code, message: err.message };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE");
  });
});

test.describe("Venmo Lifecycle - Desktop QR", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopQR: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should initialize QR story successfully", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
  });

  test("should work correctly after page reload", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    await page.reload({ waitUntil: "domcontentloaded" });

    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});
