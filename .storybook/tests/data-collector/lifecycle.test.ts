import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupDataCollectorMock,
  waitForStoryReady,
} from "./helpers";

test.describe("Data Collector - Component Lifecycle", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page);

    await page.goto(getTestUrl({ dataCollectorLifecycle: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load lifecycle story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
    await expect(container).toContainText("Component Lifecycle");
  });

  test("should display lifecycle log area", async ({ page }) => {
    await waitForStoryReady(page);

    const logDiv = page.locator("#lifecycle-log");

    await expect(logDiv).toBeVisible();
  });

  test("should have all lifecycle buttons", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    const collectBtn = page.locator("#collect-btn");
    const teardownBtn = page.locator("#teardown-btn");
    const reinitBtn = page.locator("#reinit-btn");

    await expect(initBtn).toBeVisible();
    await expect(collectBtn).toBeVisible();
    await expect(teardownBtn).toBeVisible();
    await expect(reinitBtn).toBeVisible();
  });

  test("should have correct initial button states", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    const collectBtn = page.locator("#collect-btn");
    const teardownBtn = page.locator("#teardown-btn");
    const reinitBtn = page.locator("#reinit-btn");

    await expect(initBtn).toBeEnabled();
    await expect(collectBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
    await expect(reinitBtn).toBeDisabled();
  });

  test("should initialize and enable next steps", async ({ page }) => {
    await waitForStoryReady(page);

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
    const teardownBtn = page.locator("#teardown-btn");

    await expect(collectBtn).toBeEnabled();
    await expect(teardownBtn).toBeEnabled();
  });

  test("should log initialization event", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const log = document.querySelector("#lifecycle-log");
        return log?.textContent?.includes("initialized successfully");
      },
      { timeout: 35000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("Initializing");
    expect(logText).toContain("initialized successfully");
  });

  test("should collect data and log event", async ({ page }) => {
    await waitForStoryReady(page);

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
    await collectBtn.click();

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("Collecting device data");
    expect(logText).toContain("Device data collected");
  });

  test("should teardown and enable re-initialization", async ({ page }) => {
    await waitForStoryReady(page);

    // Initialize
    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    // Teardown
    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const log = document.querySelector("#lifecycle-log");
        return log?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    const reinitBtn = page.locator("#reinit-btn");

    await expect(reinitBtn).toBeEnabled();

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeDisabled();
  });

  test("should re-initialize after teardown", async ({ page }) => {
    await waitForStoryReady(page);

    // Initialize
    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    // Teardown
    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const log = document.querySelector("#lifecycle-log");
        return log?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    // Re-initialize
    const reinitBtn = page.locator("#reinit-btn");
    await reinitBtn.click();

    await page.waitForFunction(
      () => {
        const log = document.querySelector("#lifecycle-log");
        return log?.textContent?.includes("attempt 2");
      },
      { timeout: 35000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("attempt 2");
  });

  test("should log full lifecycle sequence", async ({ page }) => {
    await waitForStoryReady(page);

    // 1. Initialize
    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    // 2. Collect
    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    // 3. Teardown
    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const log = document.querySelector("#lifecycle-log");
        return log?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    // Verify full sequence was logged
    expect(logText).toContain("Initializing");
    expect(logText).toContain("initialized successfully");
    expect(logText).toContain("Collecting device data");
    expect(logText).toContain("Device data collected");
    expect(logText).toContain("Tearing down");
    expect(logText).toContain("torn down");
  });
});
