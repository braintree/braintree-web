import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Mocking strategy:
 *
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Route interception for createVenmoPaymentContext, updateVenmoPaymentContext, polling
 * - Frame Service: NOT mocked. The dispatch-frame and venmo-landing-frame
 *   HTML files are loaded from the Braintree CDN. The popup in the Desktop
 *   Web Login flow is a real browser popup.
 * - Venmo auth: NOT automated. Completing the Venmo login inside the popup
 *   requires sandbox buyer credentials (VENMO_SANDBOX_BUYER_EMAIL / PASSWORD)
 *   and a VenmoCheckoutPage page object similar to PayPalCheckoutPage.
 */

test.describe("Venmo Desktop Web Login - Flow", function () {
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

  test("should open popup when Venmo button is clicked", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();

    const popup = await venmoPage.waitForPopup();

    expect(popup).toBeTruthy();
    expect(popup.isClosed()).toBe(false);
  });

  test("should show backdrop after popup opens", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    const backdrop = page.locator("#venmo-desktop-web-backdrop");

    await expect(backdrop).toBeVisible();
  });

  test("should display continue and cancel buttons on backdrop", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    const continueButton = page.locator("#venmo-popup-continue-button");
    const cancelButton = page.locator("#venmo-popup-cancel-button");

    await expect(continueButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  });

  test("should cancel payment when cancel button is clicked", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();

    const errorText = await venmoPage.waitForErrorResult();

    expect(errorText).toContain("Error:");
  });

  test("should show cancellation message in error result", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();

    const errorText = await venmoPage.waitForErrorResult();

    expect(errorText).toContain("canceled");
  });

  test("should re-enable Venmo button after cancellation", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    await venmoPage.clickCancelOnBackdrop();
    await venmoPage.waitForErrorResult();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test("should keep popup open when continue button is clicked", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();

    const popup = await venmoPage.waitForPopup();

    await venmoPage.waitForBackdrop();
    await venmoPage.clickContinueOnBackdrop();

    expect(popup.isClosed()).toBe(false);
  });

  test("should show backdrop that prevents additional clicks after popup opens", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();
    await venmoPage.waitForPopup();
    await venmoPage.waitForBackdrop();

    const backdrop = page.locator("#venmo-desktop-web-backdrop");

    await expect(backdrop).toBeVisible();

    const allPages = page.context().pages();
    const popups = allPages.filter((p) => p !== page && !p.isClosed());

    expect(popups.length).toBe(1);
  });

  test("should close popup when page navigates away via cancel", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const popup = await venmoPage.waitForPopup();

    await venmoPage.waitForBackdrop();
    await venmoPage.clickCancelOnBackdrop();

    await venmoPage.waitForErrorResult();

    await page.waitForTimeout(1000);

    expect(popup.isClosed()).toBe(true);
  });
});
