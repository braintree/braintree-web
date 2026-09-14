import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "../helpers/shared-waiters";

test.describe("Data Collector - Custom Correlation ID Configuration", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ dataCollectorCustomId: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load custom correlation ID story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
    await expect(container).toContainText("Custom Risk Correlation ID");
  });

  test("should display risk correlation ID input with default value", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const input = page.locator("#risk-correlation-id");

    await expect(input).toBeVisible();
    await expect(input).toHaveValue("custom-session-12345");
  });

  test("should allow editing the correlation ID", async ({ page }) => {
    await waitForStoryReady(page);

    const input = page.locator("#risk-correlation-id");
    await input.fill("my-custom-id-abc");

    await expect(input).toHaveValue("my-custom-id-abc");
  });

  test("should initialize with custom correlation ID", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return (
          status !== null &&
          status.classList.contains("data-collector-status--ready")
        );
      },
      { timeout: 35000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--success/);
    await expect(resultDiv).toContainText("custom correlation ID");
  });

  test("should use the entered correlation ID in device data", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const input = page.locator("#risk-correlation-id");
    await input.fill("test-correlation-xyz");

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeEnabled();

    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeVisible();

    const deviceDataText = await deviceDataDisplay.innerText();

    expect(deviceDataText).toContain("test-correlation-xyz");
  });

  test("should enable collect button after initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeDisabled();

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    await expect(collectBtn).toBeEnabled();
  });

  test("should have configuration panel", async ({ page }) => {
    await waitForStoryReady(page);

    const configPanel = page.locator(".data-collector-config-panel");

    await expect(configPanel).toBeVisible();
    await expect(configPanel).toContainText("Configuration");
  });

  test("should handle Fraudnet script load failure gracefully", async ({
    getTestUrl,
    page,
  }) => {
    // Block ALL external requests to simulate network issues
    await page.route("**/c.paypal.com/**", (route) => {
      route.abort("connectionfailed");
    });

    await page.route("**/b.stats.paypal.com/**", (route) => {
      route.abort("connectionfailed");
    });

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });

    // Wait for the story to load and for the SDK to attempt initialization
    await page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      {
        timeout: 30000,
      }
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
