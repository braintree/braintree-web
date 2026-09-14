import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { STORY_URLS } from "./constants";

test.describe("PayPal Checkout (legacy) — Configuration", function () {
  test("OneTimePayment (commit: true) loads the SDK with commit=true", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
      waitUntil: "domcontentloaded",
    });

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("commit=true");
    expect(sdkSrc).toContain("intent=capture");
    expect(sdkSrc).toContain("currency=USD");
  });

  test("OneTimePayment (commit: false) loads the SDK with commit=false", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(
      getTestUrl({ storyUrl: STORY_URLS.oneTimePaymentNoCommit }),
      { waitUntil: "domcontentloaded" }
    );

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("commit=false");
  });

  test("RecurringBillingAgreement loads the SDK with vault=true and intent=tokenize", async ({
    paypalCheckoutPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(
      getTestUrl({ storyUrl: STORY_URLS.recurringBillingAgreement }),
      { waitUntil: "domcontentloaded" }
    );

    await paypalCheckoutPage.waitForPayPalSDKLoaded();

    const sdkSrc = await paypalCheckoutPage.getPayPalSDKScriptSrc();

    expect(sdkSrc).not.toBeNull();
    expect(sdkSrc).toContain("vault=true");
    expect(sdkSrc).toContain("intent=tokenize");
  });
});
