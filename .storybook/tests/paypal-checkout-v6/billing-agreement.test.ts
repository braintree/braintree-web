/* eslint-disable no-console */
import { expect } from "@wdio/globals";
import { getWorkflowUrl } from "../helpers/url-utils";
import {
  getPayPalBuyerCredentials,
  switchToPayPalPopup,
  switchToOriginalWindow,
  closePayPalPopup,
  completeBillingAgreementLogin,
  approveBillingAgreement,
  waitForPopupToClose,
  cancelPayPalPayment,
} from "../helpers/paypal/checkout-helpers";
import { getResultContainerState } from "./helpers";
import {
  TEST_TIMEOUTS,
  STORY_URLS,
  BILLING_AGREEMENT_MESSAGES,
} from "./constants";

describe("PayPal Checkout V6 - Billing Agreement", function () {
  let originalWindowHandle: string;

  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: TEST_TIMEOUTS.pageLoad,
    });

    originalWindowHandle = await browser.getWindowHandle();
  });

  afterEach(async function () {
    try {
      // Ensure we're on a valid window before cleanup (prevents Firefox context issues)
      const handles = await browser.getWindowHandles();

      if (handles.length > 0) {
        await browser.switchToWindow(handles[0]);
      }
      await closePayPalPopup(originalWindowHandle);
    } catch (error) {
      console.log("Cleanup warning:", (error as Error).message);
    }

    try {
      // Force session reload to prevent browser context corruption
      await browser.reloadSession();
    } catch (error) {
      console.log("Error reloading session:", (error as Error).message);
    }
  });

  describe("Basic Vault Flow", function () {
    it("should create a simple vault billing agreement", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.text).toContain(BILLING_AGREEMENT_MESSAGES.VAULT_SUCCESS);
      expect(result.hasNonce).toBe(true);
    });

    it("should handle cancellation during vault flow", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Cancel billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await cancelPayPalPayment();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.cancelled).toBe(true);
    });
  });

  describe("RECURRING Plan Type", function () {
    it("should create RECURRING billing agreement with fixed pricing", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.recurringPlanType));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("RECURRING");
    });
  });

  describe("SUBSCRIPTION Plan Type", function () {
    it("should create SUBSCRIPTION billing agreement with trial period", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.subscriptionPlanType));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("SUBSCRIPTION");
    });
  });

  describe("UNSCHEDULED Plan Type", function () {
    it("should create UNSCHEDULED billing agreement for on-demand payments", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.unscheduledPlanType));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasNonce).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.text).toContain("UNSCHEDULED");
    });
  });

  describe("Vault Token Validation", function () {
    it("should return a valid nonce structure from billing agreement", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);

      // Validate nonce is present and has reasonable length
      const nonceMatch = result.text.match(/Nonce:\s*(\S+)/i);

      expect(nonceMatch).not.toBeNull();
      expect(nonceMatch![1].length).toBeGreaterThan(10);
    });

    it("should include payer email in vault response", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Complete billing agreement popup flow
      const originalWindow = await switchToPayPalPopup();

      await completeBillingAgreementLogin();
      await approveBillingAgreement();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const result = await browser.getBillingAgreementResult();

      expect(result.success).toBe(true);
      expect(result.hasEmail).toBe(true);
    });
  });

  describe("Error Handling", function () {
    it("should handle popup closed manually during flow", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      // Close popup manually without completing login
      const originalWindow = await switchToPayPalPopup();

      await browser.closeWindow();
      await browser.switchToWindow(originalWindow);

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      // Verify cancel/error handling
      const { isVisible, resultText } = await getResultContainerState();

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
