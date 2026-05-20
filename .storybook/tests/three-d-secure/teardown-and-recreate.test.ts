import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { TEST_CARDS } from "../../utils/test-data";
import { IBraintreeError } from "../../types/global";

test.describe("3D Secure - Teardown and Recreate", function () {
  const PUBLIC_KEY = process.env.STORYBOOK_BRAINTREE_PUBLIC_KEY || "";
  const PRIVATE_KEY = process.env.STORYBOOK_BRAINTREE_PRIVATE_KEY || "";

  test.beforeEach(async ({ page, threeDSecurePage, getTestUrl }) => {
    await page.goto(getTestUrl({ threeDSecure: true }), {
      waitUntil: "domcontentloaded",
    });
    await threeDSecurePage.initialize3DS(PUBLIC_KEY, PRIVATE_KEY);
    await threeDSecurePage.waitForHostedFieldsAnd3DSReady();
  });

  test.afterEach(async ({ page }) => {
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should properly clean up event listeners after teardown and allow new instance to work", async ({
    page,
    threeDSecurePage,
  }) => {
    await threeDSecurePage.attachEventListener(
      "customer-canceled",
      "firstInstance"
    );

    const firstInstanceListenerFired = await page.evaluate(() => {
      const instance = (window as any).threeDSecureInstance;
      instance._emit("customer-canceled");
      return (window as any).__testEventTracker?.["firstInstance"] ?? 0;
    });
    expect(firstInstanceListenerFired).toBe(1);

    await threeDSecurePage.teardown3DS();

    const iframesAfterTeardown = await page.evaluate(() => {
      return document.querySelectorAll('iframe[id^="braintree-hosted-field"]')
        .length;
    });
    expect(iframesAfterTeardown).toBe(0);

    await threeDSecurePage.initialize3DS(PUBLIC_KEY, PRIVATE_KEY);
    await threeDSecurePage.waitForHostedFieldsAnd3DSReady();

    const iframesAfterReinitialization = await page.evaluate(() => {
      return document.querySelectorAll('iframe[id^="braintree-hosted-field"]')
        .length;
    });
    expect(iframesAfterReinitialization).toBe(3);

    const secondInstancePrototype =
      await threeDSecurePage.verifyPrototypeChain();
    expect(secondInstancePrototype.hasEmit).toBe(true);
    expect(secondInstancePrototype.hasOn).toBe(true);
    expect(secondInstancePrototype.hasOff).toBe(true);

    await threeDSecurePage.attachEventListener(
      "customer-canceled",
      "secondInstance"
    );

    const eventCounts = await page.evaluate(() => {
      const instance = (window as any).threeDSecureInstance;
      instance._emit("customer-canceled");

      return {
        first: (window as any).__testEventTracker?.["firstInstance"] ?? 0,
        second: (window as any).__testEventTracker?.["secondInstance"] ?? 0,
      };
    });

    expect(eventCounts.first).toBe(1);
    expect(eventCounts.second).toBe(1);

    const instancesAreDifferent = await page.evaluate(() => {
      const secondInstance = (window as any).threeDSecureInstance;
      return (
        typeof secondInstance._emit === "function" &&
        typeof secondInstance.on === "function" &&
        typeof secondInstance.off === "function"
      );
    });
    expect(instancesAreDifferent).toBe(true);
  });

  test("should isolate EventEmitter instances between teardown and recreation", async ({
    page,
    threeDSecurePage,
  }) => {
    await threeDSecurePage.attachEventListener(
      "lookup-complete",
      "first_lookup"
    );
    await threeDSecurePage.attachEventListener(
      "customer-canceled",
      "first_cancel"
    );

    // Trigger an event manually to verify listener works
    const firstEventFired = await page.evaluate(() => {
      const instance = (window as any).threeDSecureInstance;
      // Manually emit an event
      instance._emit("customer-canceled");
      return (window as any).__testEventTracker?.["first_cancel"] ?? 0;
    });

    expect(firstEventFired).toBe(1);

    await threeDSecurePage.teardown3DS();
    await page.waitForTimeout(1000);

    await threeDSecurePage.initialize3DS(PUBLIC_KEY, PRIVATE_KEY);
    await threeDSecurePage.waitForHostedFieldsAnd3DSReady();

    await threeDSecurePage.attachEventListener(
      "lookup-complete",
      "second_lookup"
    );
    await threeDSecurePage.attachEventListener(
      "customer-canceled",
      "second_cancel"
    );

    const eventCounts = await page.evaluate(() => {
      const instance = (window as any).threeDSecureInstance;
      instance._emit("customer-canceled");

      return {
        first_cancel: (window as any).__testEventTracker?.["first_cancel"] ?? 0,
        second_cancel:
          (window as any).__testEventTracker?.["second_cancel"] ?? 0,
      };
    });

    expect(eventCounts.first_cancel).toBe(1);
    expect(eventCounts.second_cancel).toBe(1);
  });

  test("should handle teardown gracefully while verification is in progress", async ({
    threeDSecurePage,
    page,
  }) => {
    await threeDSecurePage.fillCardDetails(
      TEST_CARDS.visa.number,
      TEST_CARDS.visa.cvv,
      TEST_CARDS.visa.expirationDate
    );
    await threeDSecurePage.autofillBillingInfo();

    // Start verification but don't wait for it to complete
    await page.evaluate(() => {
      const payButton = document.querySelector("#pay-button") as HTMLElement;
      payButton?.click();
    });

    // Give verification time to start
    await page.waitForTimeout(500);

    // Teardown should complete without errors even during verification
    await threeDSecurePage.teardown3DS();

    // Verify instances are cleaned up
    await page.waitForFunction(() => {
      return (
        (window as any).hostedFieldsInstance === undefined &&
        (window as any).threeDSecureInstance === undefined
      );
    });

    // Verify Hosted Fields iframes are removed
    const hostedFieldsIframes = await page.evaluate(() => {
      return document.querySelectorAll('iframe[id^="braintree-hosted-field"]')
        .length;
    });
    expect(hostedFieldsIframes).toBe(0);

    // Verify no errors were thrown during teardown
    const hasErrors = await page.evaluate(() => {
      return (window as any).__teardownErrors !== undefined;
    });
    expect(hasErrors).toBe(false);
  });

  test("should not leak memory after multiple create/teardown cycles", async ({
    threeDSecurePage,
    page,
  }) => {
    const cycles = 5;

    for (let i = 0; i < cycles; i++) {
      await threeDSecurePage.initialize3DS(PUBLIC_KEY, PRIVATE_KEY);
      await threeDSecurePage.waitForHostedFieldsAnd3DSReady();

      const exists = await page.evaluate(() => {
        return typeof (window as any).threeDSecureInstance !== "undefined";
      });
      expect(exists).toBe(true);

      await threeDSecurePage.teardown3DS();

      const iframeCount = await page.evaluate(() => {
        return document.querySelectorAll('iframe[id^="braintree-"]').length;
      });
      expect(iframeCount).toBe(0);
    }

    const listenerCount = await page.evaluate(() => {
      return (
        (window as any).Cardinal?._events?.["payments.validated"]?.length || 0
      );
    });

    expect(listenerCount).toBeLessThanOrEqual(1);
  });

  test("should throw error when calling verifyCard after teardown", async ({
    threeDSecurePage,
    page,
  }) => {
    await page.evaluate(() => {
      (window as any).__instanceBeforeTeardown = (
        window as any
      ).threeDSecureInstance;
    });

    await threeDSecurePage.teardown3DS();

    const error = await page.evaluate(async () => {
      try {
        const instance = (window as any).__instanceBeforeTeardown;
        await instance.verifyCard({
          amount: "10.00",
          nonce: "fake-nonce",
        });
        return null;
      } catch (err) {
        return {
          code: (err as IBraintreeError).code,
          type: (err as IBraintreeError).type,
          message: (err as IBraintreeError).message,
        };
      }
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
    expect(error?.message).toContain("verifyCard");
    expect(error?.message).toContain("cannot be called after teardown");
  });

  test("should allow recreation after successful verification", async ({
    threeDSecurePage,
  }) => {
    // Complete a full verification
    await threeDSecurePage.fillCardDetails(
      TEST_CARDS.visa.number,
      TEST_CARDS.visa.cvv,
      TEST_CARDS.visa.expirationDate
    );
    await threeDSecurePage.autofillBillingInfo();

    await threeDSecurePage.clickPayButton();
    await threeDSecurePage.handleChallenge();

    const firstResult = await threeDSecurePage.getVerificationResult();
    expect(firstResult.success).toBe(true);

    // Teardown and recreate
    await threeDSecurePage.teardown3DS();
    await threeDSecurePage.initialize3DS(PUBLIC_KEY, PRIVATE_KEY);
    await threeDSecurePage.waitForHostedFieldsAnd3DSReady();

    // Verify second transaction works
    await threeDSecurePage.fillCardDetails(
      TEST_CARDS.mastercard.number,
      TEST_CARDS.mastercard.cvv,
      TEST_CARDS.mastercard.expirationDate
    );

    await threeDSecurePage.clickPayButton();
    await threeDSecurePage.handleChallenge();

    const secondResult = await threeDSecurePage.getVerificationResult();
    expect(secondResult.success).toBe(true);
  });
});
