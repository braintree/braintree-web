import { expect, Page } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupFraudnetRoutes,
  waitForStoryReady,
} from "./helpers";

/**
 * Mocking strategy:
 *
 * - Fraudnet script: Route interception blocks real c.paypal.com requests
 *   and injects a mock Fraudnet that resolves immediately with a fake session ID
 * - Gateway config: No special mocking needed (data-collector works with default config)
 * - Client: Real client creation against sandbox
 *
 * Data Collector relies on Fraudnet (c.paypal.com/da/r/fb.js) for device fingerprinting.
 * In tests, we intercept this external script to avoid network dependencies and
 * provide deterministic device data.
 */

const MOCK_CORRELATION_ID = "mock-dc-session-id-12345678";

const setupFraudnetMock = async (page: Page): Promise<void> => {
  await setupFraudnetRoutes(page);

  // Inject mock Fraudnet initialization that sets the session ID
  await page.addInitScript((mockId: string) => {
    const checkAndMock = setInterval(() => {
      if (window.braintree?.dataCollector) {
        clearInterval(checkAndMock);

        // The Fraudnet script normally creates a parameter block and collects data.
        // Our mock routes above handle the script load (returns no-op JS), so Fraudnet
        // setup resolves with null. To make data collector succeed, we override the
        // module-level create to inject a working instance.
        const originalCreate = window.braintree.dataCollector.create;

        window.braintree.dataCollector.create = async function (options: any) {
          // Intercept client creation to mock the Fraudnet loading
          const origClientCreate = window.braintree!.client.create;
          window.braintree!.client.create = async function (clientOpts: any) {
            const client = await origClientCreate.call(this, clientOpts);
            const origGetConfig = client.getConfiguration;

            client.getConfiguration = function () {
              const config = origGetConfig.call(this);

              // Ensure data collector sees a valid environment
              if (!config.gatewayConfiguration.environment) {
                config.gatewayConfiguration.environment = "sandbox";
              }

              return config;
            };

            return client;
          };

          try {
            return await originalCreate.call(this, options);
          } catch {
            // If Fraudnet failed to load (expected in test), create a mock instance
            const correlationId =
              options.riskCorrelationId ||
              options.clientMetadataId ||
              options.correlationId ||
              mockId;
            const deviceData = { correlation_id: correlationId };

            return {
              deviceData: JSON.stringify(deviceData),
              rawDeviceData: deviceData,
              getDeviceData: function (opts?: { raw?: boolean }) {
                if (opts && opts.raw) {
                  return Promise.resolve(deviceData);
                }
                return Promise.resolve(JSON.stringify(deviceData));
              },
              teardown: function () {
                return Promise.resolve();
              },
            } as any;
          }
        };
      }
    }, 10);
  }, MOCK_CORRELATION_ID);
};

const waitForDataCollectorReady = async (page: Page): Promise<void> => {
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
};

test.describe("Data Collector - Initialization & Setup", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupFraudnetMock(page);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load Data Collector story successfully", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
  });

  test("should load Braintree SDK with data-collector module", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined" &&
        typeof window.braintree.dataCollector !== "undefined",
      { timeout: 20000 }
    );

    const sdkLoaded = await page.evaluate(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.dataCollector !== "undefined"
    );

    expect(sdkLoaded).toBe(true);
  });

  test("should display informational content", async ({ page }) => {
    await waitForStoryReady(page);

    const info = page.locator(".data-collector-info");
    await info.waitFor({ state: "visible", timeout: 10000 });

    const infoText = await info.innerText();

    expect(infoText).toContain("Fraudnet");
    expect(infoText).toContain("correlation ID");
    expect(infoText).toContain("No PII");
  });

  test("should show loading state initially", async ({ page }) => {
    await waitForStoryReady(page);

    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).toBeAttached();
  });

  test("should initialize and show ready status", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toBeVisible();
    await expect(statusDiv).toContainText("Ready");
  });

  test("should hide loading after initialization", async ({ page }) => {
    await waitForDataCollectorReady(page);

    await page.waitForFunction(
      () => {
        const elem = document.querySelector("#loading");
        return elem ? window.getComputedStyle(elem).display === "none" : false;
      },
      { timeout: 35000 }
    );

    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).not.toBeVisible();
  });

  test("should show success result with correlation ID", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--success/);
    await expect(resultDiv).toContainText("Correlation ID");
  });

  test("should enable collect button after initialization", async ({
    page,
  }) => {
    await waitForDataCollectorReady(page);

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeEnabled();
  });

  test("should enable teardown button after initialization", async ({
    page,
  }) => {
    await waitForDataCollectorReady(page);

    const teardownBtn = page.locator("#teardown-btn");

    await expect(teardownBtn).toBeEnabled();
  });

  test("should have result container", async ({ page }) => {
    await waitForStoryReady(page);

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toBeAttached();
  });
});

test.describe("Data Collector - Device Data Collection", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupFraudnetMock(page);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should display device data when collect button is clicked", async ({
    page,
  }) => {
    await waitForDataCollectorReady(page);

    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeVisible();
  });

  test("should display correlation_id in device data", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");
    const deviceDataText = await deviceDataDisplay.innerText();

    expect(deviceDataText).toContain("correlation_id");
  });

  test("should display valid JSON in device data", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");
    const deviceDataText = await deviceDataDisplay.innerText();

    expect(() => JSON.parse(deviceDataText)).not.toThrow();
  });
});

test.describe("Data Collector - Teardown & Cleanup", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupFraudnetMock(page);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should teardown successfully", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null &&
          result.classList.contains("shared-result--success") &&
          result.textContent?.includes("torn down")
        );
      },
      { timeout: 10000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toContainText("torn down");
  });

  test("should disable buttons after teardown", async ({ page }) => {
    await waitForDataCollectorReady(page);

    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
  });
});
