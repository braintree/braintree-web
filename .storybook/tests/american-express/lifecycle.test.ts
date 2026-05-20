import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, setupAmexMock, waitForStoryReady } from "./helpers";

test.describe("American Express - Component Lifecycle", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupAmexMock(page);

    await page.goto(getTestUrl({ americanExpressLifecycle: true }), {
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

    const heading = page.locator("h2");

    await expect(heading).toContainText("Component Lifecycle");
  });

  test("should display lifecycle log area", async ({ page }) => {
    await waitForStoryReady(page);

    const logDiv = page.locator("#lifecycle-log");

    await expect(logDiv).toBeVisible();
  });

  test("should have lifecycle buttons", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    const rewardsBtn = page.locator("#rewards-btn");
    const teardownBtn = page.locator("#teardown-btn");
    const reinitBtn = page.locator("#reinit-btn");

    await expect(initBtn).toBeEnabled();
    await expect(rewardsBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
    await expect(reinitBtn).toBeDisabled();
  });

  test("should initialize when init button is clicked", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const statusDiv = page.locator("#amex-status");

    await expect(statusDiv).toContainText("Ready");
  });

  test("should log initialization event", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("initialized successfully");
  });

  test("should enable rewards and teardown buttons after init", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const rewardsBtn = page.locator("#rewards-btn");
    const teardownBtn = page.locator("#teardown-btn");

    await expect(rewardsBtn).toBeEnabled();
    await expect(teardownBtn).toBeEnabled();
  });

  test("should teardown and enable reinit button", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("Torn down");
      },
      undefined,
      { timeout: 10000 }
    );

    const reinitBtn = page.locator("#reinit-btn");

    await expect(reinitBtn).toBeEnabled();

    const rewardsBtn = page.locator("#rewards-btn");

    await expect(rewardsBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
  });

  test("should log teardown event", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("Torn down");
      },
      undefined,
      { timeout: 10000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("torn down");
  });

  test("should re-initialize after teardown", async ({ page }) => {
    await waitForStoryReady(page);

    // Initialize
    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    // Teardown
    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("Torn down");
      },
      undefined,
      { timeout: 10000 }
    );

    // Re-initialize
    const reinitBtn = page.locator("#reinit-btn");
    await reinitBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const statusDiv = page.locator("#amex-status");

    await expect(statusDiv).toContainText("Ready");

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("attempt 2");
  });

  test("should call getRewardsBalance from lifecycle", async ({ page }) => {
    await waitForStoryReady(page);

    const initBtn = page.locator("#init-btn");
    await initBtn.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#amex-status");
        return (
          status !== null && status.classList.contains("amex-status--ready")
        );
      },
      undefined,
      { timeout: 35000 }
    );

    const rewardsBtn = page.locator("#rewards-btn");
    await rewardsBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null &&
          (result.classList.contains("shared-result--success") ||
            result.classList.contains("shared-result--error"))
        );
      },
      undefined,
      { timeout: 15000 }
    );

    const logDiv = page.locator("#lifecycle-log");
    const logText = await logDiv.innerText();

    expect(logText).toContain("getRewardsBalance");
  });
});
