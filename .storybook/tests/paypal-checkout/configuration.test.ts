/**
 * Legacy `paypal-checkout` — configuration surfacing.
 *
 * Asserts that story/SDK options (commit, intent, currency, vault) flow
 * through to the PayPal JS SDK `<script>` tag query string, and that UI
 * controls (the RecurringBillingAgreement toggle) persist state before the
 * button click.
 *
 * What is real vs. mocked:
 *  - Real SDK script injection (no network mocks); we inspect the injected
 *    `<script>` `src` directly in the DOM.
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 *
 * Single-file local run:
 *  npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts \
 *    .storybook/tests/paypal-checkout/configuration.test.ts
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS } from "./constants";

test.describe("PayPal Checkout (legacy) — Configuration", function () {
  test("OneTimePayment (commit: true) loads the SDK with commit=true", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("commit=true");
    expect(sdkSrc).toContain("intent=capture");
    expect(sdkSrc).toContain("currency=USD");
  });

  test("OneTimePayment (commit: false) loads the SDK with commit=false", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(
      getTestUrl({ storyUrl: STORY_URLS.oneTimePaymentNoCommit }),
      { waitUntil: "domcontentloaded" }
    );

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("commit=false");
  });

  test("OneTimePayment renders the PayPal button after SDK load", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();
    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();
    expect(sdkSrc).toContain("paypal.com/sdk/js");
    expect(sdkSrc).toContain("client-id=");
  });

  test("RecurringBillingAgreement loads the SDK with vault=true and intent=tokenize", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(
      getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
      { waitUntil: "domcontentloaded" }
    );

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("vault=true");
    expect(sdkSrc).toContain("intent=tokenize");
  });

  test("vaultWithPurchaseToggle persists its checked state before click", async ({
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
    await expect(toggle).not.toBeChecked();

    await paypalCheckoutPage.toggleRecurringPurchase(true);
    await expect(toggle).toBeChecked();

    await paypalCheckoutPage.toggleRecurringPurchase(false);
    await expect(toggle).not.toBeChecked();
  });
});
