/**
 * Legacy `paypal-checkout` — OneTimePayment story integration tests.
 *
 * What is real vs. mocked:
 *  - Real Braintree sandbox + real PayPal sandbox popup login/approval.
 *  - No SDK mocking; network capture uses route interception for payload
 *    assertions only (requests are forwarded, not fulfilled).
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 *  - PAYPAL_SANDBOX_BUYER_EMAIL
 *  - PAYPAL_SANDBOX_BUYER_PASSWORD
 *  - PAYPAL_SANDBOX_OTP_CODE (optional — defaults to "111111")
 *
 * VaultInitiatedCheckout (VIC) is intentionally NOT covered here. See the
 * legacy PayPal integration test plan for the deferral rationale and the two
 * future paths for adding it (env-var driven vs. story instrumentation).
 * There is no V6 equivalent for VIC, so there is no adjacent test pattern to
 * mirror.
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { getResultContainerState } from "./helpers";
import { TEST_TIMEOUTS, STORY_URLS, RESULT_MESSAGES } from "./constants";

interface CreatePaymentPayload {
  amount?: string;
  currencyIsoCode?: string;
  currency?: string;
  intent?: string;
  experienceProfile?: Record<string, unknown>;
}

// DTBTWEB-1494
test.skip("PayPal Checkout (legacy) — One-Time Payment", function () {
  test.describe("Button Rendering", function () {
    test("renders PayPal button as visible and enabled", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.expectLegacyPayPalButtonEnabled();
    });
  });

  test.describe("Complete Checkout", function () {
    test("completes a PayPal sandbox payment successfully", async ({
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

      const paypalResult = await paypalCheckoutPage.getPayPalResult();

      expect(paypalResult.success).toBe(true);
      expect(paypalResult.text).toContain(RESULT_MESSAGES.ONE_TIME_SUCCESS);
      expect(paypalResult.text).toContain("Nonce:");
      expect(paypalResult.text).toContain("Payer Email:");
    });
  });

  test.describe("Cancel Flow", function () {
    test("surfaces a cancellation when the buyer dismisses the popup after login", async ({
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
      await paypalCheckoutPage.cancelPayPalPayment();

      await page.waitForFunction(
        () => {
          const el = document.querySelector("#result");
          const classes = el?.getAttribute("class") ?? "";
          const t = (el?.textContent ?? "").toLowerCase();
          return (
            classes.includes("shared-result--visible") && t.includes("cancel")
          );
        },
        undefined,
        { timeout: TEST_TIMEOUTS.billingAgreementComplete }
      );

      const paypalResult = await paypalCheckoutPage.getPayPalResult();

      expect(paypalResult.cancelled).toBe(true);
      expect(
        paypalResult.text.toLowerCase().includes("cancel") ||
          paypalResult.text.includes("Payment Cancelled")
      ).toBe(true);
    });
  });

  test.describe("Popup Handling", function () {
    test("handles the popup being closed manually before login", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      const popup = await paypalCheckoutPage.waitForLegacyPopup();

      await popup.close();

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const { isVisible, resultText } = await getResultContainerState(page);

      // Legacy PayPal SDK may emit a cancel via onCancel or nothing at all if
      // the popup was closed too early. Soft-assert like the V6 suite does.
      if (isVisible) {
        const lower = resultText.toLowerCase();
        const handled =
          lower.includes("cancel") ||
          lower.includes("error") ||
          lower.includes("closed");
        expect(handled).toBe(true);
      }
    });
  });

  test.describe("SDK Payload Verification", function () {
    test("sends expected createPayment payload to create_payment_resource", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      await paypalCheckoutPage.clickLegacyPayPalButton();

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const createPaymentRequest = captured.findByUrl(
        "create_payment_resource"
      );

      expect(createPaymentRequest).toBeDefined();

      const payload =
        createPaymentRequest?.body as unknown as CreatePaymentPayload;

      expect(payload.amount).toBe("10.00");
      // Legacy API sends currencyIsoCode; accept either key for robustness.
      const currency = payload.currencyIsoCode ?? payload.currency;
      expect(currency).toBe("USD");
      // createPayment passes intent: "capture"; Hermes uses "sale" (see
      // _formatPaymentResourceCheckoutData in paypal-checkout.js).
      expect(payload.intent === "sale" || payload.intent === "capture").toBe(
        true
      );
    });
  });
});
