/**
 * Legacy `paypal-checkout` — VaultFlow + RecurringBillingAgreement story
 * integration tests.
 *
 * What is real vs. mocked:
 *  - Real Braintree sandbox + real PayPal sandbox popup.
 *  - Network capture uses route interception only to observe request bodies;
 *    requests are forwarded to the real backend.
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 *  - PAYPAL_SANDBOX_BUYER_EMAIL
 *  - PAYPAL_SANDBOX_BUYER_PASSWORD
 *  - PAYPAL_SANDBOX_OTP_CODE (optional — defaults to "111111")
 */

import { expect, Page } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { getResultContainerState } from "./helpers";
import {
  TEST_TIMEOUTS,
  STORY_URLS,
  BILLING_AGREEMENT_MESSAGES,
} from "./constants";

interface PlanMetadata {
  billingCycles?: unknown[];
  currencyIsoCode?: string;
  name?: string;
  totalAmount?: number | string;
}

interface CreatePaymentVaultPayload {
  planType?: string;
  planMetadata?: PlanMetadata;
  currencyIsoCode?: string;
}

// DTBTWEB-1494
test.skip("PayPal Checkout (legacy) — Billing Agreement", function () {
  test.describe("Basic Vault Flow", function () {
    test("creates a simple vault billing agreement end-to-end", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      await paypalCheckoutPage.waitForLegacyPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.text).toContain(BILLING_AGREEMENT_MESSAGES.VAULT_SUCCESS);
      expect(result.hasNonce).toBe(true);
    });

    test("handles buyer cancellation during the vault flow", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      await paypalCheckoutPage.waitForLegacyPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
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
        { timeout: TEST_TIMEOUTS.LONG }
      );

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.cancelled).toBe(true);
    });
  });

  test.describe("Recurring Billing Agreement", function () {
    test("creates a simple vault when the purchase toggle is OFF", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
        { waitUntil: "domcontentloaded" }
      );

      await paypalCheckoutPage.waitForPayPalSDKLoaded();
      await paypalCheckoutPage.toggleRecurringPurchase(false);
      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      await paypalCheckoutPage.clickLegacyPayPalButton();

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const createPaymentRequest = captured.findByUrl("paypal_hermes");
      // Without a purchase toggle, payload must NOT include planType /
      // planMetadata — only `flow: vault`.
      if (createPaymentRequest) {
        const payload =
          createPaymentRequest.body as unknown as CreatePaymentVaultPayload;
        expect(payload.planType).toBeUndefined();
        expect(payload.planMetadata).toBeUndefined();
      }
    });

    test("includes planType + planMetadata when the purchase toggle is ON", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
        { waitUntil: "domcontentloaded" }
      );

      await paypalCheckoutPage.waitForPayPalSDKLoaded();
      await paypalCheckoutPage.toggleRecurringPurchase(true);
      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      await paypalCheckoutPage.clickLegacyPayPalButton();

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const createPaymentRequest = captured.findByUrl("paypal_hermes");

      expect(createPaymentRequest).toBeDefined();

      const payload =
        createPaymentRequest?.body as unknown as CreatePaymentVaultPayload;

      expect(payload.planType).toBe("SUBSCRIPTION");
      expect(payload.planMetadata).toBeDefined();
      expect(payload.planMetadata?.name).toBe("Premium Subscription");
      expect(payload.planMetadata?.currencyIsoCode).toBe("USD");
      expect(Array.isArray(payload.planMetadata?.billingCycles)).toBe(true);
      expect(payload.planMetadata?.billingCycles?.length).toBeGreaterThan(0);
    });
  });

  test.describe("API-level plan + intent branches", function () {
    /**
     * These tests drive createPayment directly via window.__btPayPalCheckout
     * (the test-only hook added in PayPalCheckout.stories.ts). They exist
     * specifically to hit the planType / planMetadata / intent branches in
     * _formatPaymentResourceData + _formatPlanMetadata +
     * _formatPaymentResourceCheckoutData without needing a sandbox login per
     * run. Network capture asserts the outgoing payload; the server
     * legitimately rejects the synthetic data, and that's fine.
     */

    const waitForInstance = async (page: Page): Promise<void> => {
      await page.waitForFunction(
        () => typeof window.__btPayPalCheckout !== "undefined",
        undefined,
        { timeout: TEST_TIMEOUTS.pageLoad }
      );
    };

    test("createPayment with planType SUBSCRIPTION formats planMetadata via _formatPlanMetadata", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
        { waitUntil: "domcontentloaded" }
      );

      await waitForInstance(page);

      await page.evaluate(() => {
        const instance = window.__btPayPalCheckout!;
        return instance
          .createPayment({
            flow: "vault",
            planType: "SUBSCRIPTION",
            planMetadata: {
              billingCycles: [
                {
                  billingFrequency: "1",
                  billingFrequencyUnit: "MONTH",
                  numberOfExecutions: "12",
                  sequence: "1",
                  startDate: "2030-01-01",
                  trial: false,
                  pricingScheme: { pricingModel: "FIXED", price: 10 },
                },
              ],
              currencyIsoCode: "USD",
              name: "API Subscription",
              productDescription: "API test plan",
              productQuantity: "1.0",
              productPrice: "10",
              totalAmount: 10.0,
            },
          })
          .catch(() => null);
      });

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const request = captured.findByUrl("paypal_hermes");
      expect(request).toBeDefined();

      const payload = request?.body as unknown as CreatePaymentVaultPayload;

      expect(payload.planType).toBe("SUBSCRIPTION");
      expect(payload.planMetadata).toBeDefined();
      expect(payload.planMetadata?.name).toBe("API Subscription");
      expect(payload.planMetadata?.currencyIsoCode).toBe("USD");
      expect(Array.isArray(payload.planMetadata?.billingCycles)).toBe(true);
      expect(payload.planMetadata?.billingCycles?.length).toBe(1);
    });

    test("createPayment with planType RECURRING hits the recurring branch", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
        { waitUntil: "domcontentloaded" }
      );

      await waitForInstance(page);

      await page.evaluate(() => {
        const instance = window.__btPayPalCheckout!;
        return instance
          .createPayment({
            flow: "vault",
            planType: "RECURRING",
            planMetadata: {
              billingCycles: [
                {
                  billingFrequency: "7",
                  billingFrequencyUnit: "DAY",
                  numberOfExecutions: "4",
                  sequence: "1",
                  startDate: "2030-02-01",
                  trial: false,
                  pricingScheme: { pricingModel: "FIXED", price: 5 },
                },
              ],
              currencyIsoCode: "USD",
              name: "API Recurring Plan",
              productDescription: "API recurring test",
              productPrice: "5",
              totalAmount: 20.0,
            },
          })
          .catch(() => null);
      });

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const request = captured.findByUrl("paypal_hermes");
      expect(request).toBeDefined();

      const payload = request?.body as unknown as CreatePaymentVaultPayload;

      expect(payload.planType).toBe("RECURRING");
      expect(payload.planMetadata?.name).toBe("API Recurring Plan");
      expect(payload.planMetadata?.billingCycles?.length).toBe(1);
    });

    test("createPayment in checkout flow with intent=authorize hits the non-default intent branch", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      // OneTimePayment story loads with intent: 'capture' in the SDK script,
      // but createPayment accepts its own intent and forwards it straight
      // through (unless it's 'capture', in which case the SDK aliases to
      // 'sale'). 'authorize' exercises the branch where no aliasing happens.
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      await page.evaluate(() => {
        const instance = window.__btPayPalCheckout!;
        return instance
          .createPayment({
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
            intent: "authorize",
          })
          .catch(() => null);
      });

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const request = captured.findByUrl("create_payment_resource");
      expect(request).toBeDefined();

      const payload = request?.body as unknown as {
        intent?: string;
        amount?: string;
      };

      expect(payload.intent).toBe("authorize");
      expect(payload.amount).toBe("10.00");
    });
  });

  test.describe("Popup Handling", function () {
    test("handles the popup being closed manually during the vault flow", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForLegacyPayPalButtonReady();
      const popup = await paypalCheckoutPage.waitForLegacyPopup();

      await popup.close();

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const { isVisible, resultText } = await getResultContainerState(page);

      if (isVisible) {
        const isCancelledOrError =
          resultText.includes("Cancelled") ||
          resultText.includes("cancelled") ||
          resultText.includes("Error");
        expect(isCancelledOrError).toBe(true);
      }
    });
  });
});
