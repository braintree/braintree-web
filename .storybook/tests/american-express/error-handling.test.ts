import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "./helpers";

/**
 * Error handling tests for American Express component.
 *
 * These tests verify the component handles error scenarios gracefully:
 * - Invalid authorization keys
 * - Missing nonces (AMEX_NONCE_REQUIRED)
 * - Valid configuration for comparison
 *
 * No mock is injected for the "invalid-auth" scenario so the real SDK
 * surfaces its error. The "missing-nonce" test relies on the SDK's built-in
 * validation.
 */

test.describe("American Express - Error Handling", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    // Intercept requests to invalid config URLs that result from
    // using "invalid_tokenization_key" as the authorization.
    // The SDK resolves environment "invalid" to undefined, producing
    // a URL like "undefined/merchants/.../configuration".
    await page.route(
      (url) => url.pathname.includes("undefined"),
      (route) => {
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Invalid credentials" },
          }),
        });
      }
    );

    await page.goto(getTestUrl({ americanExpressErrors: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load error handling story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();

    const heading = page.locator("h2");

    await expect(heading).toContainText("Error Handling");
  });

  test("should display error scenario options", async ({ page }) => {
    await waitForStoryReady(page);

    const missingNonceRadio = page.locator("#scenario-missing-nonce");
    const invalidAuthRadio = page.locator("#scenario-invalid-auth");
    const validRadio = page.locator("#scenario-valid");

    await expect(missingNonceRadio).toBeVisible();
    await expect(invalidAuthRadio).toBeVisible();
    await expect(validRadio).toBeVisible();
  });

  test("should have missing nonce selected by default", async ({ page }) => {
    await waitForStoryReady(page);

    const missingNonceRadio = page.locator("#scenario-missing-nonce");

    await expect(missingNonceRadio).toBeChecked();
  });

  test("should show error for invalid authorization", async ({ page }) => {
    await waitForStoryReady(page);

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");
    await invalidAuthRadio.click();

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);

    const statusDiv = page.locator("#amex-status");

    await expect(statusDiv).toHaveClass(/amex-status--error/);
  });

  test("should show error for missing nonce", async ({ page }) => {
    await waitForStoryReady(page);

    // missing-nonce is selected by default
    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);
    await expect(resultDiv).toContainText("AMEX_NONCE_REQUIRED");
  });

  test("should show error for missing nonce on express checkout", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const missingNonceCheckoutRadio = page.locator(
      "#scenario-missing-nonce-checkout"
    );
    await missingNonceCheckoutRadio.click();

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);
    await expect(resultDiv).toContainText("AMEX_NONCE_REQUIRED");
  });

  test("should re-enable test button after error", async ({ page }) => {
    await waitForStoryReady(page);

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");
    await invalidAuthRadio.click();

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    await expect(testBtn).toBeEnabled();
  });

  test("should display error code in result details", async ({ page }) => {
    await waitForStoryReady(page);

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");
    await invalidAuthRadio.click();

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 20000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toContainText("Error code:");
  });
});
