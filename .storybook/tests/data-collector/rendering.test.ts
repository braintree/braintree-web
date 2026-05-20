import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupDataCollectorMock,
  waitForStoryReady,
} from "./helpers";

const MOCK_CORRELATION_ID = "mock-dc-rendering-session";

test.describe("Data Collector - Rendering & UI", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page, MOCK_CORRELATION_ID);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should display the heading", async ({ page }) => {
    await waitForStoryReady(page);

    const heading = page.locator("h2");

    await expect(heading).toContainText("Data Collector");
  });

  test("should display description text", async ({ page }) => {
    await waitForStoryReady(page);

    const description = page.locator(".shared-description");

    await expect(description).toBeVisible();
    await expect(description).toContainText("device fingerprinting");
  });

  test("should display informational list items", async ({ page }) => {
    await waitForStoryReady(page);

    const listItems = page.locator(".data-collector-info li");
    const count = await listItems.count();

    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("should have status indicator element", async ({ page }) => {
    await waitForStoryReady(page);

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toBeAttached();
  });

  test("should have collect button", async ({ page }) => {
    await waitForStoryReady(page);

    const collectBtn = page.locator("#collect-btn");

    await expect(collectBtn).toBeAttached();
    await expect(collectBtn).toContainText("Collect Device Data");
  });

  test("should have teardown button", async ({ page }) => {
    await waitForStoryReady(page);

    const teardownBtn = page.locator("#teardown-btn");

    await expect(teardownBtn).toBeAttached();
    await expect(teardownBtn).toContainText("Teardown");
  });

  test("should have hidden device data display initially", async ({ page }) => {
    await waitForStoryReady(page);

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeAttached();
    await expect(deviceDataDisplay).not.toBeVisible();
  });

  test("should show ready status indicator with correct styling", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    const statusDiv = page.locator("#data-collector-status");

    await expect(statusDiv).toHaveClass(/data-collector-status--ready/);

    const indicator = statusDiv.locator(
      ".data-collector-status-indicator--ready"
    );

    await expect(indicator).toBeVisible();
  });
});

test.describe("Data Collector - Performance & Non-Blocking", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page, MOCK_CORRELATION_ID);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should render container before data collector initializes", async ({
    page,
  }) => {
    // The shared-container should be visible immediately, before DC finishes init
    await page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      { timeout: 10000 }
    );

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
  });

  test("should show loading indicator during initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    // Loading div should be part of the DOM
    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).toBeAttached();
  });

  test("should not block page interaction during initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    // Heading text should be readable during initialization
    const heading = page.locator("h2");

    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Data Collector");
  });
});

test.describe("Data Collector - Privacy & Security", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page, MOCK_CORRELATION_ID);

    await page.goto(getTestUrl({ dataCollector: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should document no PII collection in info panel", async ({ page }) => {
    await waitForStoryReady(page);

    const info = page.locator(".data-collector-info");
    const infoText = await info.innerText();

    expect(infoText).toContain("No PII");
  });

  test("should only contain correlation_id in device data", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => {
        const status = document.querySelector("#data-collector-status");
        return status?.classList.contains("data-collector-status--ready");
      },
      { timeout: 35000 }
    );

    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");
    const text = await deviceDataDisplay.innerText();
    const parsed = JSON.parse(text);

    // Device data should contain correlation_id - no PII
    expect(parsed).toHaveProperty("correlation_id");
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("name");
    expect(parsed).not.toHaveProperty("phone");
    expect(parsed).not.toHaveProperty("address");
  });

  test("should document data collection transparency", async ({ page }) => {
    await waitForStoryReady(page);

    const description = page.locator(".shared-description");
    const descText = await description.innerText();

    // Story should communicate what's being collected
    expect(descText).toContain("fraud");
  });

  test("should block Fraudnet beacon requests in test", async ({ page }) => {
    await waitForStoryReady(page);

    // Track any beacon requests that arrive after story load.
    // With the Fraudnet script mocked to a no-op, no beacon should fire.
    const beaconRequests: string[] = [];

    page.on("request", (req) => {
      if (req.url().includes("stats.paypal.com")) {
        beaconRequests.push(req.url());
      }
    });

    await page.waitForTimeout(500);

    expect(beaconRequests.length).toBe(0);
  });
});
