import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS } from "./constants";

test.describe("PayPal Checkout V6", function () {
  test.describe("Button Rendering", function () {
    test("should render PayPal button correctly", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();

      const paypalButton = page.locator(".paypal-button");
      await expect(paypalButton).toBeVisible();
      await expect(paypalButton).toBeEnabled();
    });
  });

  test.describe("Complete Checkout", function () {
    test("should complete PayPal payment successfully", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();

      await page.evaluate(() => {
        window.paypal!.mock_triggerApproval();
      });

      const paypalResult = await paypalCheckoutPage.getPayPalResult();

      expect(paypalResult.success).toBe(true);
      expect(paypalResult.text).toContain("PayPal payment authorized!");
      expect(paypalResult.text).toContain("Nonce:");
      expect(paypalResult.text).toContain("Payer Email:");
    });
  });

  test.describe("Cancel Flow", function () {
    test("should handle customer cancellation during PayPal authentication", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await paypalCheckoutPage.waitForPayPalButtonReady();
      await page.waitForFunction(() => {
        window.paypal!.mock_triggerCancel();
        return true;
      });
      const paypalResult = await paypalCheckoutPage.getPayPalResult();

      expect(paypalResult.cancelled).toBe(true);
      expect(paypalResult.text).toContain("Payment Cancelled");
    });
  });
});
