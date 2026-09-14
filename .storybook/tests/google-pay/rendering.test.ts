import { expect, Locator, Page } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest, waitForStoryReady } from "../helpers/shared-waiters";
import { clientConfigurationWithGooglePayHandler } from "../../../msw/services/atmosphere";
import { installGooglePayPaymentsClientMock } from "./helpers";

test.describe("Google Pay Storybook Rendering", function () {
  const findAndWaitFor = async (
    page: Page,
    identifier: string
  ): Promise<Locator> => {
    const element = page.locator(`#${identifier}`);
    await element.waitFor({ state: "visible", timeout: 10000 });

    return element;
  };

  const waitForGooglePayButtons = async (page: Page): Promise<void> => {
    const result = await page.waitForFunction(
      () => {
        const container = document.querySelector("#google-pay-button");
        const button = container?.querySelector(".google-pay-button");
        if (container && button) return { ok: true };

        const resultDiv = document.querySelector("#result");
        if (
          resultDiv &&
          resultDiv.classList.contains("shared-result--error") &&
          resultDiv.classList.contains("shared-result--visible")
        ) {
          return { ok: false, error: resultDiv.textContent };
        }

        return null;
      },
      { timeout: 35000 }
    );

    const value = await result.jsonValue();

    if (!value?.ok) {
      throw new Error(
        `Google Pay initialization failed: ${value?.error || "unknown error"}`
      );
    }
  };

  test.beforeEach(async ({ getTestUrl, page, network }) => {
    network.use(clientConfigurationWithGooglePayHandler);

    await installGooglePayPaymentsClientMock(page);

    // Block real pay.js requests as a safety net
    await page.route("**/pay.google.com/**", (route) => {
      route.abort();
    });

    await page.goto(getTestUrl({ googlePay: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load Google Pay story successfully", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");
    await expect(container).toBeVisible();
  });

  test("should load Braintree SDK with google-payment module", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => {
        return (
          typeof window.braintree !== "undefined" &&
          typeof window.braintree.client !== "undefined" &&
          typeof window.braintree.googlePayment !== "undefined"
        );
      },
      { timeout: 20000 }
    );

    const sdkLoaded = await page.evaluate(() => {
      return (
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.googlePayment !== "undefined"
      );
    });

    expect(sdkLoaded).toBe(true);
  });

  test("should display form elements correctly", async ({ page }) => {
    await waitForStoryReady(page);

    const amountInput = await findAndWaitFor(page, "amount");
    const currencySelect = await findAndWaitFor(page, "currency");

    expect(currencySelect).toBeTruthy();
    expect(await amountInput.getAttribute("value")).toBe("19.99");
  });

  test("should have correct currency options", async ({ page }) => {
    await waitForStoryReady(page);

    const options = await page.evaluate(() => {
      const select = document.querySelector("#currency") as HTMLSelectElement;
      if (!select) return [];
      return Array.from(select.options).map((opt) => opt.value);
    });

    expect(options).toEqual(["USD", "EUR", "GBP", "CAD"]);
  });

  test("should display Google Pay requirements list", async ({ page }) => {
    await waitForStoryReady(page);

    const requirements = page.locator(".google-pay-requirements");
    await requirements.waitFor({ state: "visible", timeout: 10000 });
    const requirementText = await requirements.innerText();

    expect(requirementText).toContain("Chrome browser");
    expect(requirementText).toContain("Google account");
    expect(requirementText).toContain("HTTPS");
  });

  test("should display loading state initially", async ({ page }) => {
    await waitForStoryReady(page);

    const loadingDiv = page.locator("#loading");
    await expect(loadingDiv).toBeAttached();
  });

  test("should hide loading state after initialization", async ({ page }) => {
    await waitForStoryReady(page);

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

  test("should display Google Pay button when ready", async ({ page }) => {
    await waitForGooglePayButtons(page);

    const buttonContainer = page.locator("#google-pay-button");
    const googlePayButton = page.locator(".gpay-button");

    await expect(buttonContainer).toBeVisible();
    await expect(googlePayButton).toBeVisible();
  });

  test("should display fallback button", async ({ page }) => {
    await waitForGooglePayButtons(page);

    const fallbackButton = page.locator(".google-pay-button");

    await expect(fallbackButton).toBeVisible();
    await expect(fallbackButton).toContainText("Google Pay");
  });

  test("should have billing address checkbox", async ({ page }) => {
    await waitForStoryReady(page);

    const checkbox = await findAndWaitFor(page, "request-billing-address");
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  });

  test("should have email checkbox", async ({ page }) => {
    await waitForStoryReady(page);

    const checkbox = await findAndWaitFor(page, "request-email");
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  });

  test("should have shipping address checkbox", async ({ page }) => {
    await waitForStoryReady(page);

    const checkbox = await findAndWaitFor(page, "request-shipping");
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  });

  test("should update amount input value", async ({ page }) => {
    await waitForStoryReady(page);

    const amountInput = await findAndWaitFor(page, "amount");
    await expect(amountInput).toHaveValue("19.99");

    await amountInput.fill("99.99");
    await expect(amountInput).toHaveValue("99.99");
  });

  test("should update currency selection", async ({ page }) => {
    await waitForStoryReady(page);

    const currencySelect = await findAndWaitFor(page, "currency");
    await currencySelect.selectOption("EUR");
    await expect(currencySelect).toHaveValue("EUR", { timeout: 5000 });
  });

  test("should have result container", async ({ page }) => {
    await waitForStoryReady(page);

    const resultDiv = page.locator("#result");
    await expect(resultDiv).toBeAttached();
  });

  test("should show success result when Google Pay button is clicked", async ({
    page,
  }) => {
    await waitForGooglePayButtons(page);

    const fallbackButton = page.locator(".google-pay-button");
    await fallbackButton.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null &&
          result.classList.contains("shared-result--visible") &&
          result.classList.contains("shared-result--success")
        );
      },
      { timeout: 15000 }
    );

    const resultDiv = page.locator("#result");
    const resultText = await resultDiv.innerText();

    expect(resultText).toContain("Google Pay payment authorized");
    expect(resultText).toContain("fake-google-pay-nonce-123");
    expect(resultText).toContain("Visa");
  });
});
