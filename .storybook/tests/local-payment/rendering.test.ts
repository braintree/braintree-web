import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { waitForLocalPaymentReadyOrError } from "./helpers";
import { waitForStoryReady } from "../helpers/shared-waiters";

test.describe("Local Payment Methods - iDEAL", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should load the iDEAL story", async ({ page }) => {
    await waitForStoryReady(page);
    await expect(
      page.getByRole("heading", { name: /iDEAL Local Payment/i })
    ).toBeVisible();
  });

  test("should load Braintree SDK with local-payment module", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.localPayment !== "undefined" &&
        typeof (window.braintree as { localPayment: { create?: unknown } })
          .localPayment.create === "function",
      { timeout: 20000 }
    );
  });

  test("should show amount, currency, and country fields with defaults", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const amount = page.locator("#amount");
    const currency = page.locator("#currency");
    const country = page.locator("#country-code");

    await expect(amount).toBeVisible();
    await expect(amount).toHaveValue("10.00");

    await expect(currency).toBeVisible();
    await expect(currency).toHaveValue("EUR");
    const currencyValues = await currency
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value)
      );
    expect(currencyValues).toEqual(["EUR", "USD"]);

    await expect(country).toBeVisible();
    await expect(country).toHaveValue("NL");
    const countryValues = await country
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value)
      );
    expect(countryValues).toEqual(["NL", "DE", "IT"]);
  });

  test("should enable the pay button with iDEAL label after initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    const paymentButton = page.locator("#payment-button");
    await expect(paymentButton).toBeEnabled();
    await expect(paymentButton).toHaveText("Pay with iDEAL");
  });

  test("should hide the loading state after initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    const loading = page.locator("#loading");
    await expect(loading).not.toBeVisible();
  });

  test("should allow editing amount, currency, and country", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    await page.locator("#amount").fill("25.50");
    await expect(page.locator("#amount")).toHaveValue("25.50");

    await page.locator("#currency").selectOption("USD");
    await expect(page.locator("#currency")).toHaveValue("USD");

    await page.locator("#country-code").selectOption("DE");
    await expect(page.locator("#country-code")).toHaveValue("DE");
  });
});

test.describe("Local Payment Methods - Pay with Crypto", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ localPaymentCrypto: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should load the Pay with Crypto story", async ({ page }) => {
    await waitForStoryReady(page);
    await expect(
      page.getByRole("heading", { name: /Pay with Crypto Local Payment/i })
    ).toBeVisible();
  });

  test("should not render amount, currency, or country fields for crypto", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    await expect(page.locator("#amount")).toHaveCount(0);
    await expect(page.locator("#currency")).toHaveCount(0);
    await expect(page.locator("#country-code")).toHaveCount(0);
  });

  test("should load Braintree SDK with local-payment module", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.localPayment !== "undefined" &&
        typeof (window.braintree as { localPayment: { create?: unknown } })
          .localPayment.create === "function",
      { timeout: 20000 }
    );
  });

  test("should enable the pay button for crypto after initialization", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    const paymentButton = page.locator("#payment-button");
    await expect(paymentButton).toBeEnabled();
    await expect(paymentButton).toHaveText("Pay with crypto");
  });
});

test.describe("Local Payment Methods - iDEAL (mocked local_payments/create)", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should open a window when starting payment (frame + mocked create)", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    const paymentButton = page.locator("#payment-button");
    const popupPromise = page.waitForEvent("popup", { timeout: 20000 });

    await paymentButton.click();
    const popup = await popupPromise;

    try {
      expect(popup).toBeDefined();
    } finally {
      if (popup && !popup.isClosed()) {
        await popup.close();
      }
    }
  });
});
