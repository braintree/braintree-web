import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS, RESULT_MESSAGES } from "./constants";

test.describe("PayPal Checkout (legacy) — One-Time Payment", function () {
  test.describe("Complete Checkout", function () {
    test("completes a PayPal sandbox payment successfully", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalSDKLoaded();

      await page.evaluate(() => {
        window.paypal?.mock_triggerApproval();
      });

      const paypalResult = await paypalCheckoutPage.getPayPalResult();

      expect(paypalResult.success).toBe(true);
      expect(paypalResult.text).toContain(RESULT_MESSAGES.ONE_TIME_SUCCESS);
      expect(paypalResult.text).toContain("Nonce:");
      expect(paypalResult.text).toContain("Payer Email:");
    });
  });
});
