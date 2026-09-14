/**
 * Local Payment — `startPayment` client-side validation and `teardown` via
 * `window.__btLocalPayment` (no story UI changes). Covers helpers exercised
 * through `hasMissingOption`: crypto, Pay Upon Invoice (address / line items),
 * Blik (level_0 / oneClick), and `LocalPayment.prototype.teardown`.
 *
 * Options with `onPaymentStart` are built inside `page.evaluate` so functions
 * are not serialized across the test boundary.
 *
 * Each test loads a fresh story page so module state (e.g. Blik-related
 * `constants` mutations) does not leak across cases.
 */

import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { waitForLocalPaymentInstance } from "./helpers";

test.describe("Local Payment - startPayment validation helpers", function () {
  test("crypto rejects when cryptoOptions.approvalUrl is missing", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const err = await page.evaluate(() =>
      window
        .__btLocalPayment!.startPayment({
          paymentType: "crypto",
          cryptoOptions: {},
        })
        .then(
          function () {
            return null;
          },
          function (e: { code?: string; details?: unknown }) {
            return { code: e.code, details: e.details };
          }
        )
    );

    expect(err?.code).toBe(
      "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION"
    );
    expect(String(err?.details)).toContain("cryptoOptions.approvalUrl");
  });

  test("pay_upon_invoice rejects when address.streetAddress is missing", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const err = await page.evaluate(() => {
      const opts = {
        onPaymentStart: function (_d: unknown, start: () => void) {
          start();
        },
        paymentType: "pay_upon_invoice",
        paymentTypeCountryCode: "NL",
        amount: "10.00",
        fallback: {
          url: "https://example.com/fallback",
          buttonText: "Button Text",
        },
        shippingAddressRequired: true,
        currencyCode: "USD",
        givenName: "First",
        surname: "Last",
        email: "email@example.com",
        phone: "1234",
        displayName: "My Brand!",
        address: {
          extendedAddress: "Unit 1",
          locality: "Chicago",
          region: "IL",
          postalCode: "60654",
          countryCode: "US",
        },
        billingAddress: {
          streetAddress: "Prinzregentenstr 99991658",
          locality: "Freiburg",
          postalCode: "79111",
          countryCode: "DE",
        },
        locale: "en-DE",
        birthDate: "1990-01-01",
        correlationId: "bt-correlationId",
        lineItems: [
          {
            category: "PHYSICAL_GOODS",
            name: "Air Jordan Shoe",
            quantity: "1",
            unitAmount: "81.00",
            unitTaxAmount: "19.00",
          },
        ],
        phoneCountryCode: "49",
        shippingAmount: "2.00",
        customerServiceInstructions: "pleasefollow",
      };

      return window.__btLocalPayment!.startPayment(opts as never).then(
        function () {
          return null;
        },
        function (e: { code?: string; details?: unknown }) {
          return { code: e.code, details: e.details };
        }
      );
    });

    expect(err?.code).toBe(
      "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION"
    );
    expect(String(err?.details)).toContain("address.streetAddress");
  });

  test("pay_upon_invoice rejects when lineItems[0].category is missing", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const err = await page.evaluate(() => {
      const opts = {
        onPaymentStart: function (_d: unknown, start: () => void) {
          start();
        },
        paymentType: "pay_upon_invoice",
        paymentTypeCountryCode: "NL",
        amount: "10.00",
        fallback: {
          url: "https://example.com/fallback",
          buttonText: "Button Text",
        },
        shippingAddressRequired: true,
        currencyCode: "USD",
        givenName: "First",
        surname: "Last",
        email: "email@example.com",
        phone: "1234",
        displayName: "My Brand!",
        address: {
          streetAddress: "123 Address",
          extendedAddress: "Unit 1",
          locality: "Chicago",
          region: "IL",
          postalCode: "60654",
          countryCode: "US",
        },
        billingAddress: {
          streetAddress: "Prinzregentenstr 99991658",
          locality: "Freiburg",
          postalCode: "79111",
          countryCode: "DE",
        },
        locale: "en-DE",
        birthDate: "1990-01-01",
        correlationId: "bt-correlationId",
        lineItems: [
          {
            name: "Air Jordan Shoe",
            quantity: "1",
            unitAmount: "81.00",
            unitTaxAmount: "19.00",
          },
        ],
        phoneCountryCode: "49",
        shippingAmount: "2.00",
        customerServiceInstructions: "pleasefollow",
      };

      return window.__btLocalPayment!.startPayment(opts as never).then(
        function () {
          return null;
        },
        function (e: { code?: string; details?: unknown }) {
          return { code: e.code, details: e.details };
        }
      );
    });

    expect(err?.code).toBe(
      "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION"
    );
    expect(String(err?.details)).toContain("lineItems.category");
  });

  test("blik rejects when blikOptions.level_0.authCode is missing", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const err = await page.evaluate(() =>
      window
        .__btLocalPayment!.startPayment({
          onPaymentStart: function (_d: unknown, start: () => void) {
            start();
          },
          paymentType: "blik",
          paymentTypeCountryCode: "PL",
          amount: "10.00",
          shippingAddressRequired: true,
          currencyCode: "PLN",
          givenName: "First",
          surname: "Last",
          email: "email@example.com",
          phone: "1234",
          displayName: "My Brand!",
          address: {
            streetAddress: "123 Address",
            extendedAddress: "Unit 1",
            locality: "Chicago",
            region: "IL",
            postalCode: "60654",
            countryCode: "US",
          },
          blikOptions: {
            level_0: {},
          },
        } as never)
        .then(
          function () {
            return null;
          },
          function (e: { code?: string; details?: unknown }) {
            return { code: e.code, details: e.details };
          }
        )
    );

    expect(err?.code).toBe(
      "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION"
    );
    expect(String(err?.details)).toContain("blikOptions.level_0.authCode");
  });

  test("blik rejects when oneClick subsequent flow is missing consumerReference", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const err = await page.evaluate(() =>
      window
        .__btLocalPayment!.startPayment({
          onPaymentStart: function (_d: unknown, start: () => void) {
            start();
          },
          paymentType: "blik",
          paymentTypeCountryCode: "PL",
          amount: "10.00",
          shippingAddressRequired: true,
          currencyCode: "PLN",
          givenName: "First",
          surname: "Last",
          email: "email@example.com",
          phone: "1234",
          displayName: "My Brand!",
          address: {
            streetAddress: "123 Address",
            extendedAddress: "Unit 1",
            locality: "Chicago",
            region: "IL",
            postalCode: "60654",
            countryCode: "US",
          },
          blikOptions: {
            oneClick: {
              aliasKey: "456456",
            },
          },
        } as never)
        .then(
          function () {
            return null;
          },
          function (e: { code?: string; details?: unknown }) {
            return { code: e.code, details: e.details };
          }
        )
    );

    expect(err?.code).toBe(
      "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION"
    );
    expect(String(err?.details)).toContain(
      "blikOptions.oneClick.consumerReference"
    );
  });
});

test.describe("Local Payment - teardown", function () {
  test("teardown resolves after localPayment is ready", async ({
    getTestUrl,
    page,
  }) => {
    await page.goto(getTestUrl({ localPaymentIdeal: true }), {
      waitUntil: "domcontentloaded",
    });
    await waitForLocalPaymentInstance(page);

    const ok = await page.evaluate(() =>
      window.__btLocalPayment!.teardown().then(
        function () {
          return true;
        },
        function () {
          return false;
        }
      )
    );
    expect(ok).toBe(true);
  });
});
