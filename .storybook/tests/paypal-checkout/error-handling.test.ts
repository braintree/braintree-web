import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS, RESULT_MESSAGES } from "./constants";
import {
  createPaymentResourceErrorHandler,
  tokenizePaymentErrorHandler,
} from "../../../msw/services/gateway";

test.describe("PayPal Checkout (legacy) — Error Handling", function () {
  test("surfaces a PayPal error when create_payment_resource returns 422", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
    network,
  }) => {
    network.use(createPaymentResourceErrorHandler);

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const error: Error | undefined = await page.evaluate(async () => {
      const braintree = window.braintree;
      if (braintree === undefined) {
        throw new Error("braintree sdk not loaded");
      }

      try {
        const client = await braintree.client.create({
          authorization: "sandbox_123_merchantid",
        });
        const paypalCheckout = await braintree.paypalCheckout.create({
          client,
        });
        await paypalCheckout.createPayment({
          flow: "checkout",
        });
        return undefined;
      } catch (e) {
        if (e instanceof Error) {
          return e;
        }
        throw e;
      }
    });
    expect(error).toBeDefined();
    expect(error?.message).toEqual("There was a problem with your request.");
  });

  test("surfaces PayPal error when paypal_accounts tokenization fails after approval", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
    network,
  }) => {
    network.use(tokenizePaymentErrorHandler);

    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });
    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    await page.evaluate(() => {
      window.paypal?.mock_triggerApproval();
    });

    const paypalResult = await paypalCheckoutPage.getPayPalResult();

    expect(paypalResult.error).toBe(true);
    expect(paypalResult.text).toContain(RESULT_MESSAGES.PAYPAL_ERROR);
    expect(paypalResult.text).toContain(RESULT_MESSAGES.CLIENT_REQUEST_ERROR);
  });
});
