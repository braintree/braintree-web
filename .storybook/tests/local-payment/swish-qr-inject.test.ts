/**
 * Swish desktop QR flow: `startPayment` with `requestQrCode` calls `injectQrCode`
 * when `local_payments/create` returns `qrDetails.qrImage` (see
 * `src/local-payment/external/local-payment.js`). Exercises the real
 * `inject-qr-code.js` bundled in `local-payment.min.js` for integration (V8) coverage.
 *
 * Story: `swishQr` in LocalPayments.stories.ts. All network traffic is mocked via
 * MSW (`scenarios.localPayment.swishQr`), so `local_payments/create` returns
 * `qrDetails.qrImage` and the suite runs fully offline.
 *
 * Error-path tests call `startPayment` from `page.evaluate` so `injectQrCode`
 * throws (invalid base64, missing selector, invalid container) are asserted via
 * rejected promise codes without relying on the story button UI.
 */

import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  waitForLocalPaymentInstance,
  waitForLocalPaymentReadyOrError,
} from "./helpers";
import { waitForStoryReady } from "../helpers/shared-waiters";
import { localPaymentSwishQrInvalidBase64Handler } from "../../../msw/services/gateway";

test.describe("Local Payment Methods - Swish QR inject", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ localPaymentSwishQr: true }), {
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

  test("injects QR image into swish-qr-container after startPayment", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);

    await page.locator("#payment-button").click();

    await page.waitForFunction(
      () => {
        const img = document.querySelector(
          "#swish-qr-container img"
        ) as HTMLImageElement | null;
        return (
          img &&
          typeof img.src === "string" &&
          img.src.indexOf("data:image/png;base64,") === 0
        );
      },
      { timeout: 20000 }
    );

    const img = page.locator("#swish-qr-container img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("alt", "QR Code for payment");

    const src = await img.getAttribute("src");
    expect(src).toContain(`data:image/png;base64`);

    // Verify the full flow completed without error
    await expect(
      page.locator("#result.shared-result--error")
    ).not.toBeVisible();
    await expect(page.locator("#payment-button")).not.toBeDisabled();
  });
});

test.describe("Local Payment Methods - Swish QR inject errors", function () {
  test("startPayment rejects LOCAL_PAYMENT_QR_CODE_INVALID_DATA when qrImage is not valid base64", async ({
    getTestUrl,
    page,
    network,
  }) => {
    network.use(localPaymentSwishQrInvalidBase64Handler);

    await page.goto(getTestUrl({ localPaymentSwishQr: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);
    await waitForLocalPaymentInstance(page);

    const code = await page.evaluate(() => {
      return window
        .__btLocalPayment!.startPayment({
          paymentType: "swish",
          paymentTypeCountryCode: "SE",
          amount: "10.00",
          currencyCode: "SEK",
          address: { countryCode: "SE" },
          givenName: "John",
          surname: "Doe",
          email: "payer@example.com",
          phone: "1234567890",
          fallback: {
            url: "https://your-domain.com/page-to-complete-checkout",
            buttonText: "Complete Payment",
          },
          swishOptions: {
            requestQrCode: true,
            qrContainer: "#swish-qr-container",
          },
          onPaymentStart: function () {
            // Swish QR path receives { paymentId } only; no start callback.
          },
        })
        .then(
          function () {
            return null;
          },
          function (e: { code?: string }) {
            return e.code;
          }
        );
    });

    expect(code).toBe("LOCAL_PAYMENT_QR_CODE_INVALID_DATA");
  });

  test("startPayment rejects LOCAL_PAYMENT_QR_CODE_CONTAINER_NOT_FOUND when qrContainer selector matches nothing", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentSwishQr: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);
    await waitForLocalPaymentInstance(page);

    const code = await page.evaluate(() => {
      return window
        .__btLocalPayment!.startPayment({
          paymentType: "swish",
          paymentTypeCountryCode: "SE",
          amount: "10.00",
          currencyCode: "SEK",
          address: { countryCode: "SE" },
          givenName: "John",
          surname: "Doe",
          email: "payer@example.com",
          phone: "1234567890",
          fallback: {
            url: "https://your-domain.com/page-to-complete-checkout",
            buttonText: "Complete Payment",
          },
          swishOptions: {
            requestQrCode: true,
            qrContainer: "#lpm-missing-qr-container-selector",
          },
          onPaymentStart: function () {
            // Swish QR path receives { paymentId } only; no start callback.
          },
        })
        .then(
          function () {
            return null;
          },
          function (e: { code?: string }) {
            return e.code;
          }
        );
    });

    expect(code).toBe("LOCAL_PAYMENT_QR_CODE_CONTAINER_NOT_FOUND");
  });

  test("startPayment rejects LOCAL_PAYMENT_QR_CODE_INVALID_CONTAINER when qrContainer is not a string or element", async ({
    getTestUrl,
    page,
    network,
  }) => {
    await page.goto(getTestUrl({ localPaymentSwishQr: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForStoryReady(page);
    await waitForLocalPaymentReadyOrError(page);
    await waitForLocalPaymentInstance(page);

    const code = await page.evaluate(() => {
      return window
        .__btLocalPayment!.startPayment({
          paymentType: "swish",
          paymentTypeCountryCode: "SE",
          amount: "10.00",
          currencyCode: "SEK",
          address: { countryCode: "SE" },
          givenName: "John",
          surname: "Doe",
          email: "payer@example.com",
          phone: "1234567890",
          fallback: {
            url: "https://your-domain.com/page-to-complete-checkout",
            buttonText: "Complete Payment",
          },
          swishOptions: {
            requestQrCode: true,
            qrContainer: { notAnElement: true },
          },
          onPaymentStart: function () {
            // Swish QR path receives { paymentId } only; no start callback.
          },
        })
        .then(
          function () {
            return null;
          },
          function (e: { code?: string }) {
            return e.code;
          }
        );
    });

    expect(code).toBe("LOCAL_PAYMENT_QR_CODE_INVALID_CONTAINER");
  });
});
