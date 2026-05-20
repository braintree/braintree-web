import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupFraudnetRoutes,
  waitForStoryReady,
} from "./helpers";

test.describe("Data Collector - Error Handling", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupFraudnetRoutes(page);

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

    await page.goto(getTestUrl({ dataCollectorErrors: true }), {
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
    await expect(container).toContainText("Error Handling");
  });

  test("should display error scenario options", async ({ page }) => {
    await waitForStoryReady(page);

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");
    const validRadio = page.locator("#scenario-valid");

    await expect(invalidAuthRadio).toBeVisible();
    await expect(validRadio).toBeVisible();
  });

  test("should have invalid auth selected by default", async ({ page }) => {
    await waitForStoryReady(page);

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");

    await expect(invalidAuthRadio).toBeChecked();
  });

  test("should have test button enabled", async ({ page }) => {
    await waitForStoryReady(page);

    const testBtn = page.locator("#test-btn");

    await expect(testBtn).toBeEnabled();
  });

  test("should show error for invalid authorization", async ({ page }) => {
    await waitForStoryReady(page);

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--visible")
        );
      },
      { timeout: 35000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);
  });

  test("should display error status indicator for invalid auth", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return (
          status !== null &&
          status.classList.contains("data-collector-status--error")
        );
      },
      { timeout: 35000 }
    );

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toContainText("Error");
  });

  test("should re-enable test button after error", async ({ page }) => {
    await waitForStoryReady(page);

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--visible");
      },
      { timeout: 35000 }
    );

    await expect(testBtn).toBeEnabled();
  });

  test("should allow switching between error scenarios", async ({ page }) => {
    await waitForStoryReady(page);

    const validRadio = page.locator("#scenario-valid");
    await validRadio.click();

    await expect(validRadio).toBeChecked();

    const invalidAuthRadio = page.locator("#scenario-invalid-auth");

    await expect(invalidAuthRadio).not.toBeChecked();
  });

  test("should have configuration panel with scenario options", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const configPanel = page.locator(".data-collector-config-panel");

    await expect(configPanel).toBeVisible();
    await expect(configPanel).toContainText("Error Scenarios");
  });

  test("should show loading state during error scenario test", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const testBtn = page.locator("#test-btn");
    await testBtn.click();

    // Loading should appear briefly
    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).toBeAttached();
  });
});

test.describe("Data Collector - Network Error Resilience", function () {
  test.beforeEach(async ({ page }) => {
    // Block ALL external requests to simulate network issues
    await page.route("**/c.paypal.com/**", (route) => {
      route.abort("connectionfailed");
    });

    await page.route("**/b.stats.paypal.com/**", (route) => {
      route.abort("connectionfailed");
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should handle Fraudnet script load failure gracefully", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });

    // Wait for the story to load and for the SDK to attempt initialization
    await page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      { timeout: 30000 }
    );

    // The page should still be functional even if Fraudnet fails
    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();

    // Wait for error or success - the component should handle failure
    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--visible");
      },
      { timeout: 35000 }
    );

    // Story should show some result (either error or success depending on mock)
    const resultDiv = page.locator("#result");

    await expect(resultDiv).toBeVisible();
  });
});
