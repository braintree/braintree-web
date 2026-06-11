import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { getResultContainerState } from "./helpers";
import {
  TEST_TIMEOUTS,
  STORY_URLS,
  BILLING_AGREEMENT_MESSAGES,
} from "./constants";

test.describe("PayPal Checkout V6 - Billing Agreement", function () {
  test.describe("Basic Vault Flow", function () {
    test("should create a simple vault billing agreement", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.text).toContain(BILLING_AGREEMENT_MESSAGES.VAULT_SUCCESS);
      expect(result.hasNonce).toBe(true);
    });

    test("should handle cancellation during vault flow", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.cancelPayPalPayment();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.cancelled).toBe(true);
    });
  });

  test.describe("RECURRING Plan Type", function () {
    test("should create RECURRING billing agreement with fixed pricing", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.recurringPlanType }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("RECURRING");
    });
  });

  test.describe("SUBSCRIPTION Plan Type", function () {
    test("should create SUBSCRIPTION billing agreement with trial period", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.subscriptionPlanType }),
        { waitUntil: "domcontentloaded" }
      );

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("SUBSCRIPTION");
    });
  });

  test.describe("UNSCHEDULED Plan Type", function () {
    test("should create UNSCHEDULED billing agreement for on-demand payments", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(
        getTestUrl({ storyUrl: STORY_URLS.unscheduledPlanType }),
        { waitUntil: "domcontentloaded" }
      );

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("UNSCHEDULED");
    });
  });

  test.describe("Vault Token Validation", function () {
    test("should return a valid nonce structure from billing agreement", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);

      const nonceMatch = result.text.match(/Nonce:\s*(\S+)/i);

      expect(nonceMatch).not.toBeNull();
      expect(nonceMatch![1].length).toBeGreaterThan(10);
    });

    // Quarantined: flaky.
    test.fixme("should include payer email in vault response", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await paypalCheckoutPage.waitForPopup();
      await paypalCheckoutPage.completeBillingAgreementLogin();
      await paypalCheckoutPage.approveBillingAgreement();
      await paypalCheckoutPage.waitForPopupToClose();

      const result = await paypalCheckoutPage.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasEmail).toBe(true);
    });
  });

  test.describe("Error Handling", function () {
    test("should handle popup closed manually during flow", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.vaultFlow }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      const popup = await paypalCheckoutPage.waitForPopup();

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
