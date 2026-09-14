import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "../helpers/shared-waiters";

test.describe("Data Collector - Device Data Collection", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
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
    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");

    await expect(deviceDataDisplay).toBeVisible();
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

  test("should display valid JSON in device data", async ({ page }) => {
    const collectBtn = page.locator("#collect-btn");
    await collectBtn.click();

    const deviceDataDisplay = page.locator("#device-data-display");
    const deviceDataText = await deviceDataDisplay.innerText();

    expect(() => JSON.parse(deviceDataText)).not.toThrow();
  });
});
