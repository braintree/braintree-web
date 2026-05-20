import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "./helpers";

test.describe("American Express - Rendering", function () {
  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should render rewards balance story layout", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ americanExpress: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);

    const heading = page.locator("h2");

    await expect(heading).toContainText("Rewards Balance");

    const description = page.locator(".shared-description");

    await expect(description).toBeVisible();

    const configPanel = page.locator(".amex-config-panel");

    await expect(configPanel).toBeVisible();

    const nonceInput = page.locator("#nonce-input");

    await expect(nonceInput).toBeVisible();

    const checkBtn = page.locator("#check-balance-btn");

    await expect(checkBtn).toBeAttached();

    const teardownBtn = page.locator("#teardown-btn");

    await expect(teardownBtn).toBeAttached();
  });

  test("should render Express Checkout story layout", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ americanExpressExpressCheckout: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);

    const heading = page.locator("h2");

    await expect(heading).toContainText("Express Checkout Profile");

    const nonceInput = page.locator("#amex-nonce-input");

    await expect(nonceInput).toBeVisible();

    const getProfileBtn = page.locator("#get-profile-btn");

    await expect(getProfileBtn).toBeAttached();
  });

  test("should render error handling story layout", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ americanExpressErrors: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);

    const heading = page.locator("h2");

    await expect(heading).toContainText("Error Handling");

    const testBtn = page.locator("#test-btn");

    await expect(testBtn).toBeVisible();
    await expect(testBtn).toBeEnabled();

    const radios = page.locator('input[name="error-scenario"]');

    expect(await radios.count()).toBe(4);
  });

  test("should render lifecycle story layout", async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ americanExpressLifecycle: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);

    const heading = page.locator("h2");

    await expect(heading).toContainText("Component Lifecycle");

    const logDiv = page.locator("#lifecycle-log");

    await expect(logDiv).toBeVisible();

    const initBtn = page.locator("#init-btn");

    await expect(initBtn).toBeEnabled();
  });
});
