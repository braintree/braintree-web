import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Accessibility tests for Venmo desktop flows.
 *
 * Mocking strategy:
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Standard route interception
 * - Frame Service: NOT mocked (real popup for desktop web login)
 */

test.describe("Venmo Accessibility - Desktop Web", function () {
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

  test("Venmo button image should have an alt attribute or accessible name", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");
    const img = button.locator("img");

    await expect(img).toBeAttached();

    const alt = await img.getAttribute("alt");
    const ariaLabel =
      (await button.getAttribute("aria-label")) ||
      (await img.getAttribute("aria-label"));

    expect(alt || ariaLabel).toBeTruthy();
  });

  test("Venmo button should be keyboard-focusable", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    await page.locator("#venmo-button").focus();

    await expect(page.locator("#venmo-button")).toBeFocused();
  });

  test("Venmo button should respond to Enter keypress", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    await page.locator("#venmo-button").focus();

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 });

    await page.keyboard.press("Enter");

    const popup = await popupPromise;

    expect(popup).toBeTruthy();

    if (!popup.isClosed()) {
      await popup.close();
    }
  });

  test("backdrop cancel button should be keyboard-accessible", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    const cancelButton = page.locator("#venmo-popup-cancel-button");

    await expect(cancelButton).toBeVisible();

    const tabIndex = await cancelButton.evaluate(
      (el) => (el as HTMLElement).tabIndex
    );

    expect(tabIndex).toBeGreaterThanOrEqual(0);
  });

  test("backdrop continue button should be keyboard-accessible", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    const continueButton = page.locator("#venmo-popup-continue-button");

    await expect(continueButton).toBeVisible();

    const tabIndex = await continueButton.evaluate(
      (el) => (el as HTMLElement).tabIndex
    );

    expect(tabIndex).toBeGreaterThanOrEqual(0);
  });

  test("loading indicator should be accessible during initialization", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForStoryReady();

    const loading = page.locator("#loading");

    await expect(loading).toBeAttached();

    const text = await loading.textContent();

    expect(text).toBeTruthy();
    expect(text).toContain("Initializing");
  });

  test("error result should be visible and contain descriptive text", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();

    const errorText = await venmoPage.waitForErrorResult();

    expect(errorText.length).toBeGreaterThan(0);
    expect(errorText).toContain("Error:");
  });
});
