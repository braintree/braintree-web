import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupDataCollectorMock,
  waitForStoryReady,
} from "./helpers";

const MOCK_CORRELATION_ID = "mock-dc-deferred-session";

const waitForDeferredReady = async (page: Page): Promise<void> => {
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

test.describe("Data Collector - Deferred Client Setup", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page, MOCK_CORRELATION_ID);

    await page.goto(getTestUrl({ dataCollectorDeferred: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load deferred client story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
    await expect(container).toContainText("Deferred Client Setup");
  });

  test("should display deferred client benefits", async ({ page }) => {
    await waitForStoryReady(page);

    const info = page.locator(".data-collector-info");

    await expect(info).toBeVisible();

    const infoText = await info.innerText();

    expect(infoText).toContain("immediately");
    expect(infoText).toContain("background");
    expect(infoText).toContain("getDeviceData");
  });

  test("should initialize deferred client and show ready status", async ({
    page,
  }) => {
    await waitForDeferredReady(page);

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toContainText("Deferred Data Collector Ready");
  });

  test("should enable get device data buttons after initialization", async ({
    page,
  }) => {
    await waitForDeferredReady(page);

    const getDeviceDataBtn = page.locator("#get-device-data-btn");
    const getRawDataBtn = page.locator("#get-raw-data-btn");

    await expect(getDeviceDataBtn).toBeEnabled();
    await expect(getRawDataBtn).toBeEnabled();
  });

  test("should collect device data as string via getDeviceData", async ({
    page,
  }) => {
    await waitForDeferredReady(page);

    const getDeviceDataBtn = page.locator("#get-device-data-btn");
    await getDeviceDataBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeVisible();

    const text = await deviceDataDisplay.innerText();

    expect(text).toContain("correlation_id");
    expect(() => JSON.parse(text)).not.toThrow();
  });

  test("should collect raw device data as object", async ({ page }) => {
    await waitForDeferredReady(page);

    const getRawDataBtn = page.locator("#get-raw-data-btn");
    await getRawDataBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeVisible();

    const text = await deviceDataDisplay.innerText();

    expect(text).toContain("correlation_id");
  });

  test("should show success result after collecting data", async ({ page }) => {
    await waitForDeferredReady(page);

    const getDeviceDataBtn = page.locator("#get-device-data-btn");
    await getDeviceDataBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.textContent?.includes("collected");
      },
      { timeout: 10000 }
    );

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toContainText("collected");
  });
});
