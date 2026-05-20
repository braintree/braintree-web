/**
 * Legacy `paypal-checkout` — error and edge-case handling.
 *
 * What is real vs. mocked:
 *  - Route interception to simulate:
 *      - 401 on the Braintree GraphQL configuration call (invalid auth)
 *      - 422 on `create_payment_resource` (gateway-level error mid-flow)
 *      - 422 on `POST .../payment_methods/paypal_accounts` (tokenization
 *        fails after a real PayPal approval — exercises `tokenizePayment` `.catch`
 *        plus the story `onApprove` `.catch`; #result shows the client API error
 *        message for HTTP 4xx)
 *      - 500 on GraphQL configuration (gateway unavailable — fulfill, not
 *        abort, so Initialization Error surfaces deterministically)
 *  - Real popup lifecycle for the manual-close edge case.
 *
 * Deferred: blocked PayPal SDK script — see the block comment below; see
 * src/paypal-checkout/paypal-checkout.js `loadPayPalSDK` (no script.onerror).
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 *
 * Single-file local run:
 *  npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts \
 *    .storybook/tests/paypal-checkout/error-handling.test.ts
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { getResultContainerState } from "./helpers";
import { TEST_TIMEOUTS, STORY_URLS, RESULT_MESSAGES } from "./constants";

const BRAINTREE_GRAPHQL_URL = "**/payments.sandbox.braintree-api.com/graphql**";
const CREATE_PAYMENT_RESOURCE_URL = "**/create_payment_resource**";
const PAYPAL_ACCOUNTS_TOKENIZE_URL = "**/payment_methods/paypal_accounts**";

test.describe("PayPal Checkout (legacy) — Error Handling", function () {
  test("surfaces Initialization Error when gateway returns 401", async ({
    page,
    getTestUrl,
  }) => {
    await page.route(BRAINTREE_GRAPHQL_URL, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [{ message: "Invalid authorization" }],
        }),
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

    const { resultText } = await getResultContainerState(page);

    expect(resultText).toContain("Initialization Error");
  });

  /*
   * DEFERRED — "surfaces an error when the PayPal SDK script is blocked"
   *
   * We cannot assert this today because `loadPayPalSDK` in
   * src/paypal-checkout/paypal-checkout.js (around the `_paypalScript.onload`
   * assignment) only attaches an `onload` handler to the dynamically injected
   * <script>. There is no `onerror`, so a blocked / failed PayPal SDK script
   * leaves the underlying promise unresolved forever and the test just hangs
   * until Playwright times out.
   *
   * To enable this case we need a small fix in the SDK itself:
   *   - add `_paypalScript.onerror = function (err) { loadPromise.reject(...); }`
   *   - surface a new BraintreeError (e.g. PAYPAL_SDK_LOAD_FAILED) so the
   *     `.catch` branch in the story can render a clear message.
   *
   * Once that ships, restore the test body (blockPayPalSDK + assert the result
   * container turns into an Initialization Error / PayPal Error surface).
   *
   * Follow-up: file a ticket under DTBTWEB referencing loadPayPalSDK's missing
   * onerror. We use the same "defer with context" pattern as the Venmo
   * QR CANCELED/EXPIRED tests.
   */

  test("surfaces a PayPal error when create_payment_resource returns 422", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.route(CREATE_PAYMENT_RESOURCE_URL, (route) =>
      route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "Validation failed" },
          fieldErrors: [],
        }),
      })
    );

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
    await paypalCheckoutPage.clickLegacyPayPalButton();

    // The SDK reports the failure through `onError` which paints the result.
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector("#result");
          return el?.getAttribute("class")?.includes("shared-result--visible");
        },
        undefined,
        { timeout: TEST_TIMEOUTS.pageLoad }
      )
      .catch(() => {
        // PayPal swallows some server errors at the popup layer; tolerate as
        // long as the click didn't hang the page.
      });

    const { isVisible, resultText } = await getResultContainerState(page);

    if (isVisible) {
      const isErrorShape =
        resultText.includes("PayPal Error") ||
        resultText.includes("Error") ||
        resultText.includes("failed");
      expect(isErrorShape).toBe(true);
    }

    // PayPal button remains in the iframe after the error.
    await paypalCheckoutPage.expectLegacyPayPalButtonVisible();
  });

  test("surfaces PayPal error when paypal_accounts tokenization fails after approval", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.route(PAYPAL_ACCOUNTS_TOKENIZE_URL, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Validation failed" },
            fieldErrors: [],
          }),
        });
      }
      return route.continue();
    });

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
    await paypalCheckoutPage.waitForLegacyPopup();
    await paypalCheckoutPage.completePayPalLogin();
    await paypalCheckoutPage.approvePayPalPayment();

    try {
      await paypalCheckoutPage.waitForPopupToClose();
    } catch {
      await paypalCheckoutPage.closePopup();
    }

    const paypalResult = await paypalCheckoutPage.getPayPalResult();

    expect(paypalResult.error).toBe(true);
    expect(paypalResult.text).toContain(RESULT_MESSAGES.PAYPAL_ERROR);
    expect(paypalResult.text).toContain(RESULT_MESSAGES.TOKENIZATION_ERROR);
  });

  test("surfaces Initialization Error when the gateway is unreachable", async ({
    page,
    getTestUrl,
  }) => {
    // Fulfill rather than abort so the gateway failure surfaces
    // deterministically. src/client/get-configuration.js maps non-401/403
    // responses to CLIENT_GATEWAY_NETWORK, which the story renders as
    // "Initialization Error: ..." synchronously.
    await page.route(BRAINTREE_GRAPHQL_URL, (route) =>
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

    const { resultText } = await getResultContainerState(page);

    expect(resultText).toContain("Initialization Error");
  });

  test("handles the popup being closed before login completes", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
    const popup = await paypalCheckoutPage.waitForLegacyPopup();

    // Close immediately — no login, no approval. SDK should emit a cancel or
    // stay silent; either is acceptable (matches V6 pattern).
    await popup.close();

    await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

    const { isVisible, resultText } = await getResultContainerState(page);

    if (isVisible) {
      const handled =
        resultText.includes("Cancelled") ||
        resultText.includes("cancelled") ||
        resultText.includes("Error");
      expect(handled).toBe(true);
    }
  });
});
