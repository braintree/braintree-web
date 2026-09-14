import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "../helpers/shared-waiters";
import { installGooglePayPaymentsClientMock } from "./helpers";

test.describe("Google Pay - Error Handling", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await installGooglePayPaymentsClientMock(page);

    await page.route("**/pay.google.com/**", (route) => {
      route.abort();
    });

    await page.goto(getTestUrl({ googlePay: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should show not-enabled error when googlePay config is absent", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null &&
          result.classList.contains("shared-result--error") &&
          result.classList.contains("shared-result--visible")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);
    await expect(resultDiv).toContainText(
      "Google Pay is not enabled for this merchant."
    );
  });
});
