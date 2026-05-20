import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupAmexMock,
  setupAmexNetworkErrorMock,
  waitForAmexReady,
  waitForStoryReady,
} from "./helpers";

/**
 * Mocking strategy:
 *
 * - Gateway/Amex requests: Intercepted at the network level via Playwright
 *   page.route() in setupAmexMock to return mock rewards balance and
 *   express checkout profile data
 * - Client: Real client creation against sandbox
 * - Amex API: Mock responses avoid needing real Amex card nonces
 */

test.describe("American Express - Initialization & Setup", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupAmexMock(page);

    await page.goto(getTestUrl({ americanExpress: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load American Express story successfully", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
  });

  test("should load Braintree SDK with american-express module", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined" &&
        typeof window.braintree.americanExpress !== "undefined",
      undefined,
      { timeout: 20000 }
    );
  });

  test("should display informational content", async ({ page }) => {
    await waitForStoryReady(page);

    const info = page.locator(".amex-info");
    await info.waitFor({ state: "visible", timeout: 10000 });

    const infoText = await info.innerText();

    expect(infoText).toContain("getRewardsBalance");
    expect(infoText).toContain("nonce");
  });

  test("should show loading state initially", async ({ page }) => {
    await waitForStoryReady(page);

    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).toBeAttached();
  });

  test("should initialize and show ready status", async ({ page }) => {
    await waitForAmexReady(page);

    const statusDiv = page.locator("#amex-status");

    await expect(statusDiv).toBeVisible();
    await expect(statusDiv).toContainText("Ready");
  });

  test("should hide loading after initialization", async ({ page }) => {
    await waitForAmexReady(page);

    await page.waitForFunction(
      () => {
        const elem = document.querySelector("#loading");
        return elem ? window.getComputedStyle(elem).display === "none" : false;
      },
      undefined,
      { timeout: 35000 }
    );

    const loadingDiv = page.locator("#loading");

    await expect(loadingDiv).not.toBeVisible();
  });

  test("should show success result after initialization", async ({ page }) => {
    await waitForAmexReady(page);

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--success/);
    await expect(resultDiv).toContainText("initialized successfully");
  });

  test("should enable check balance button after initialization", async ({
    page,
  }) => {
    await waitForAmexReady(page);

    const checkBtn = page.locator("#check-balance-btn");

    await expect(checkBtn).toBeEnabled();
  });

  test("should enable teardown button after initialization", async ({
    page,
  }) => {
    await waitForAmexReady(page);

    const teardownBtn = page.locator("#teardown-btn");

    await expect(teardownBtn).toBeEnabled();
  });

  test("should have nonce input field", async ({ page }) => {
    await waitForStoryReady(page);

    const nonceInput = page.locator("#nonce-input");

    await expect(nonceInput).toBeVisible();
    await expect(nonceInput).toHaveValue("fake-valid-amex-nonce");
  });

  test("should have result container", async ({ page }) => {
    await waitForStoryReady(page);

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toBeAttached();
  });
});

test.describe("American Express - Rewards Balance", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupAmexMock(page);

    await page.goto(getTestUrl({ americanExpress: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should check rewards balance when button is clicked", async ({
    page,
  }) => {
    await waitForAmexReady(page);

    const checkBtn = page.locator("#check-balance-btn");
    await checkBtn.click();

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

    const responseData = page.locator("#response-data");

    await expect(responseData).toBeVisible();
  });

  test("should display response data after balance check", async ({ page }) => {
    await waitForAmexReady(page);

    const checkBtn = page.locator("#check-balance-btn");
    await checkBtn.click();

    const responseData = page.locator("#response-data");
    await responseData.waitFor({ state: "visible", timeout: 15000 });

    const responseText = await responseData.innerText();

    expect(responseText).toBeTruthy();
    expect(responseText.length).toBeGreaterThan(0);
  });

  test("should use custom nonce from input field", async ({ page }) => {
    await waitForAmexReady(page);

    const nonceInput = page.locator("#nonce-input");
    await nonceInput.fill("custom-test-nonce");

    const checkBtn = page.locator("#check-balance-btn");
    await checkBtn.click();

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

    const responseData = page.locator("#response-data");

    await expect(responseData).toBeVisible();
  });
});

test.describe("American Express - Teardown & Cleanup", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupAmexMock(page);

    await page.goto(getTestUrl({ americanExpress: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should teardown successfully", async ({ page }) => {
    await waitForAmexReady(page);

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
      undefined,
      { timeout: 10000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toContainText("torn down");
  });

  test("should disable buttons after teardown", async ({ page }) => {
    await waitForAmexReady(page);

    const teardownBtn = page.locator("#teardown-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("torn down");
      },
      undefined,
      { timeout: 10000 }
    );

    const checkBtn = page.locator("#check-balance-btn");

    await expect(checkBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
  });
});

test.describe("American Express - Rewards Balance Network Error", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    // Set up error routes so getRewardsBalance triggers AMEX_NETWORK_ERROR
    await setupAmexNetworkErrorMock(page);

    await page.goto(getTestUrl({ americanExpress: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should show AMEX_NETWORK_ERROR when rewards balance request fails", async ({
    page,
  }) => {
    await waitForAmexReady(page);

    const checkBtn = page.locator("#check-balance-btn");
    await checkBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 15000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toHaveClass(/shared-result--error/);
    await expect(resultDiv).toContainText("AMEX_NETWORK_ERROR");
  });

  test("should re-enable check balance button after network error", async ({
    page,
  }) => {
    await waitForAmexReady(page);

    const checkBtn = page.locator("#check-balance-btn");
    await checkBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--error")
        );
      },
      undefined,
      { timeout: 15000 }
    );

    await expect(checkBtn).toBeEnabled();
  });
});
