import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS } from "./constants";

test.describe("PayPal Checkout (legacy) — Lifecycle", function () {
  test("does not leak duplicate PayPal SDK <script> tags on a single load", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const count = await paypalCheckoutPage.getPayPalSDKScriptCount();
    // A single story render should not inject the SDK script more than once.
    expect(count).toBeLessThanOrEqual(1);
  });
});
