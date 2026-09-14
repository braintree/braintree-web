import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { IBraintreeError } from "../../types/global";

test.describe("3D Secure - Teardown", function () {
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

  test("should throw when calling verifyCard after teardown", async ({
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
});
