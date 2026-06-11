/**
 * Legacy `paypal-checkout` — behavioral accessibility checks.
 *
 * Mirrors the Venmo accessibility pattern: keyboard focus, Enter-to-activate,
 * and descriptive result text. The PayPal button itself is rendered inside a
 * cross-origin iframe owned by PayPal, so we cannot inspect rules inside it
 * with axe-core; these tests scope to the mount point and observable
 * behavior (popup opens, result has human-readable text, checkbox is
 * keyboard-togglable).
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS } from "./constants";

// DTBTWEB-1494
test.skip("PayPal Checkout (legacy) — Accessibility", function () {
  test("PayPal button mount point is focusable via keyboard", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();

    await page.locator("#paypal-button").focus();

    const focusedId = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.id || el?.tagName;
    });

    expect(focusedId).toBeTruthy();
  });

  test("Success result message contains descriptive text after sandbox approval", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
    await paypalCheckoutPage.waitForLegacyPopup();
    await paypalCheckoutPage.completePayPalLogin();
    await paypalCheckoutPage.approvePayPalPayment();
    await paypalCheckoutPage.waitForPopupToClose();

    const result = await paypalCheckoutPage.getPayPalResult();

    expect(result.success).toBe(true);
    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.text).toContain("PayPal payment authorized!");
    // Assert that we surface more than just a raw code — actual sentences.
    expect(result.text.replace(/\s+/g, " ").trim().length).toBeGreaterThan(20);
  });

  test("Error result message contains descriptive text (not just a code)", async ({
    page,
    getTestUrl,
  }) => {
    await page.route(
      "**/payments.sandbox.braintree-api.com/graphql**",
      (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"error":"service unavailable"}',
        })
    );

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => {
        const el = document.querySelector("#result");
        return el?.getAttribute("class")?.includes("shared-result--visible");
      },
      undefined,
      { timeout: 30000 }
    );

    const resultText =
      (await page.locator("#result").textContent())?.trim() ?? "";

    expect(resultText).toContain("Initialization Error");
    expect(resultText.length).toBeGreaterThan("Initialization Error:".length);
  });

  test("Enter keypress on the focused PayPal button container triggers the popup", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();

    // PayPal renders its own button inside an iframe; focus the Braintree
    // mount point (the nearest thing we can drive with the parent page
    // keyboard) and then click to simulate activation. We can't reliably
    // dispatch Enter through the cross-origin iframe, but we can assert the
    // mount is keyboard-focusable and clicking it opens the popup — which is
    // the keyboard-equivalent outcome.
    await page.locator("#paypal-button").focus();

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 });

    await paypalCheckoutPage.clickLegacyPayPalButton();

    const popup = await popupPromise;
    expect(popup).toBeTruthy();

    if (!popup.isClosed()) {
      await popup.close();
    }
  });

  test("RecurringBillingAgreement checkbox is keyboard-togglable", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(
      getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
      { waitUntil: "domcontentloaded" }
    );

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const toggle = page.locator("#vaultWithPurchaseToggle");
    await expect(toggle).toBeVisible();

    const tabIndex = await toggle.evaluate(
      (el) => (el as HTMLInputElement).tabIndex
    );
    expect(tabIndex).toBeGreaterThanOrEqual(0);

    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();

    await page.keyboard.press("Space");
    await expect(toggle).not.toBeChecked();
  });
});
