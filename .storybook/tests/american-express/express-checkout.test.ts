import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupAmexMock,
  setupAmexNetworkErrorMock,
  waitForStoryReady,
} from "./helpers";

test.describe("American Express - Express Checkout Profile", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupAmexMock(page);

    await page.goto(getTestUrl({ americanExpressExpressCheckout: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load Express Checkout story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();

    const heading = page.locator("h2");

    await expect(heading).toContainText("Express Checkout Profile");
  });

  test("should initialize and show ready status", async ({ page }) => {
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

  test("should have Amex nonce input field", async ({ page }) => {
    await waitForStoryReady(page);

    const nonceInput = page.locator("#amex-nonce-input");

    await expect(nonceInput).toBeVisible();
    await expect(nonceInput).toHaveValue("fake-amex-express-checkout-nonce");
  });

  test("should enable get profile button after initialization", async ({
    page,
  }) => {
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

    const getProfileBtn = page.locator("#get-profile-btn");

    await expect(getProfileBtn).toBeEnabled();
  });

  test("should retrieve Express Checkout profile", async ({ page }) => {
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

    const getProfileBtn = page.locator("#get-profile-btn");
    await getProfileBtn.click();

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

  test("should display response data with card information", async ({
    page,
  }) => {
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

    const getProfileBtn = page.locator("#get-profile-btn");
    await getProfileBtn.click();

    const responseData = page.locator("#response-data");
    await responseData.waitFor({ state: "visible", timeout: 15000 });

    const responseText = await responseData.innerText();

    expect(responseText).toContain("American Express");
  });

  test("should display informational content about Express Checkout", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const info = page.locator(".amex-info");
    await info.waitFor({ state: "visible", timeout: 10000 });

    const infoText = await info.innerText();

    expect(infoText).toContain("getExpressCheckoutProfile");
    expect(infoText).toContain("nonce");
  });
});

test.describe("American Express - Express Checkout Network Error", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    // Set up error routes so getExpressCheckoutProfile triggers AMEX_NETWORK_ERROR
    await setupAmexNetworkErrorMock(page);

    await page.goto(getTestUrl({ americanExpressExpressCheckout: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should show AMEX_NETWORK_ERROR when express checkout request fails", async ({
    page,
  }) => {
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

    const getProfileBtn = page.locator("#get-profile-btn");
    await getProfileBtn.click();

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

  test("should re-enable get profile button after network error", async ({
    page,
  }) => {
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

    const getProfileBtn = page.locator("#get-profile-btn");
    await getProfileBtn.click();

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

    await expect(getProfileBtn).toBeEnabled();
  });
});
