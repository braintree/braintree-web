/**
 * Legacy `paypal-checkout` — component lifecycle / teardown observable
 * side effects.
 *
 * Stories expose `window.__btPayPalCheckout` for API-level tests, but these
 * lifecycle checks still avoid calling `teardown()` directly. They verify
 * behavior reachable from the parent page: re-init after navigation,
 * recovery after a failed init, and no duplicate
 * `<script src="paypal.com/sdk/js...">` tags on a single load.
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { TEST_TIMEOUTS, STORY_URLS } from "./constants";

test.describe("PayPal Checkout (legacy) — Lifecycle", function () {
  test("button renders again after navigating away and back", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.expectLegacyPayPalButtonVisible();

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
      waitUntil: "domcontentloaded",
    });
    await paypalCheckoutPage.expectLegacyPayPalButtonVisible();

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });
    await paypalCheckoutPage.expectLegacyPayPalButtonVisible();
  });

  test("re-initializes successfully after a failed init", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    // First visit: gateway responds with 500 → expect Initialization Error.
    // Using fulfill instead of abort so the failure surfaces deterministically
    // via CLIENT_GATEWAY_NETWORK (see src/client/get-configuration.js).
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
      { timeout: TEST_TIMEOUTS.pageLoad }
    );

    const resultText =
      (await page.locator("#result").textContent())?.trim() ?? "";
    expect(resultText).toContain("Initialization Error");

    // Clear the mock route and reload — a fresh init should succeed.
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.expectLegacyPayPalButtonEnabled();
  });

  test("does not leak duplicate PayPal SDK <script> tags on a single load", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();
    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();

    const count = await paypalCheckoutPage.getPayPalSDKScriptCount();
    // A single story render should not inject the SDK script more than once.
    expect(count).toBeLessThanOrEqual(1);
  });
});
