/**
 * Legacy `paypal-checkout` — API-level coverage tests.
 *
 * These tests drive `PayPalCheckout` prototype methods directly via
 * `page.evaluate(() => window.__btPayPalCheckout.<method>(...))` rather than
 * going through the PayPal button + popup flow. This lets us exercise argument
 * validation, payload formatting, and teardown branches that the UI-level
 * tests cannot reach without sandbox login on every run.
 *
 * Test-only hook: `.storybook/stories/PayPalCheckout/PayPalCheckout.stories.ts`
 * assigns the created `paypalCheckoutInstance` to `window.__btPayPalCheckout`
 * in each automatable setup function (`setupPayPalCheckout`,
 * `setupPayPalVault`, `setupRecurringBilling`). The `__bt` prefix flags this
 * as a test-only exposure; storybook is dev-only, so it never ships to
 * merchants. VaultInitiatedCheckout is intentionally NOT instrumented.
 *
 * Note: `createPayment` does not run `_verifyConsistentCurrency` (that helper
 * is only used by `updatePayment`). A checkout call with `currency: "EUR"`
 * while the SDK script was loaded with `currency=USD` may still resolve in
 * sandbox; we assert invalid/missing checkout fields via gateway errors instead.
 *
 * What is real vs. mocked:
 *  - Real Braintree sandbox GraphQL for client configuration.
 *  - Real PayPal JS SDK script load (we only attempt `createPayment`; no
 *    buyer login or popup is triggered).
 *  - Network capture via `setupNetworkCapture` inspects POST bodies. The
 *    server legitimately rejects fake ids (`PAY-x`, etc.); we only assert on
 *    the outgoing payload, not the response.
 *
 * Required env vars (from .env):
 *  - STORYBOOK_BRAINTREE_TOKENIZATION_KEY
 *
 * Single-file local run:
 *  npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts \
 *    .storybook/tests/paypal-checkout/api-coverage.test.ts
 */

import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { TEST_TIMEOUTS, STORY_URLS } from "./constants";

interface BraintreeErrorShape {
  name?: string;
  code?: string;
  type?: string;
  message?: string;
}

interface CreatePaymentResourcePayload {
  amount?: string;
  currencyIsoCode?: string;
  intent?: string;
  lineItems?: unknown[];
  experienceProfile?: { userAction?: string };
  [key: string]: unknown;
}

interface UpdatePaymentResourcePayload {
  paymentId?: string;
  currencyIsoCode?: string;
  amount?: string;
  lineItems?: unknown[];
  shippingOptions?: unknown[];
  amountBreakdown?: Record<string, unknown>;
  [key: string]: unknown;
}

const CREATE_PAYMENT_URL = "create_payment_resource";
const PATCH_PAYMENT_URL = "patch_payment_resource";

/**
 * Poll until `window.__btPayPalCheckout` is populated. The story kicks off
 * client.create -> paypalCheckout.create asynchronously, so the hook isn't
 * ready the moment the page finishes DOMContentLoaded.
 */
const waitForInstance = async (page: {
  waitForFunction: (
    _fn: () => boolean,
    _opts?: { timeout?: number }
  ) => Promise<unknown>;
}): Promise<void> => {
  await page.waitForFunction(
    () => typeof window.__btPayPalCheckout !== "undefined",
    { timeout: TEST_TIMEOUTS.pageLoad }
  );
};

test.describe("PayPal Checkout (legacy) — API coverage", function () {
  test.describe("createPayment validation", function () {
    test("rejects with PAYPAL_FLOW_OPTION_REQUIRED when no options are passed", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const err = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;
        try {
          await instance.createPayment(undefined);
          return null;
        } catch (e) {
          const braintreeErr = e as BraintreeErrorShape;
          return {
            code: braintreeErr.code,
            type: braintreeErr.type,
            message: braintreeErr.message,
          };
        }
      })) as BraintreeErrorShape | null;

      expect(err).not.toBeNull();
      expect(err?.code).toBe("PAYPAL_FLOW_OPTION_REQUIRED");
    });

    test("rejects with PAYPAL_FLOW_OPTION_REQUIRED for an unknown flow value", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const err = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;
        try {
          await instance.createPayment({
            // @ts-expect-error intentional invalid flow for API validation
            flow: "not-a-real-flow",
          });
          return null;
        } catch (e) {
          const braintreeErr = e as BraintreeErrorShape;
          return { code: braintreeErr.code };
        }
      })) as BraintreeErrorShape | null;

      expect(err?.code).toBe("PAYPAL_FLOW_OPTION_REQUIRED");
    });

    test("rejects checkout createPayment when amount and currency are missing", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const err = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;
        try {
          await instance.createPayment({ flow: "checkout" });
          return null;
        } catch (e) {
          const braintreeErr = e as BraintreeErrorShape;
          return { code: braintreeErr.code, type: braintreeErr.type };
        }
      })) as BraintreeErrorShape | null;

      expect(err).not.toBeNull();
      expect(err?.code).toBe("PAYPAL_INVALID_PAYMENT_OPTION");
    });
  });

  test.describe("createPayment payload formatting", function () {
    test("populates checkout-specific fields from shippingAddressOverride, lineItems, and userAction", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      // Fire and forget — server will reject fake data but _formatPayment*
      // runs before the request leaves the SDK.
      await page.evaluate(() => {
        const instance = window.__btPayPalCheckout!;
        return instance
          .createPayment({
            flow: "checkout",
            amount: "42.00",
            currency: "USD",
            intent: "capture",
            userAction: "commit",
            requestBillingAgreement: true,
            enableShippingAddress: true,
            shippingAddressOverride: {
              recipientName: "Test Buyer",
              line1: "123 Main St",
              city: "San Jose",
              countryCode: "US",
            },
            lineItems: [
              {
                name: "Item A",
                quantity: "1",
                unitAmount: "42.00",
                kind: "debit",
              },
            ],
          })
          .catch(() => null);
      });

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const request = captured.findByUrl(CREATE_PAYMENT_URL);
      expect(request).toBeDefined();

      const payload = request?.body as unknown as CreatePaymentResourcePayload;

      expect(payload.amount).toBe("42.00");
      expect(payload.currencyIsoCode).toBe("USD");
      // 'capture' is aliased to 'sale' on the legacy endpoint.
      expect(payload.intent).toBe("sale");
      expect(Array.isArray(payload.lineItems)).toBe(true);
      expect((payload.lineItems as unknown[]).length).toBe(1);
      expect(payload.experienceProfile?.userAction).toBe("commit");
      // shippingAddressOverride keys are copied onto paymentResource directly.
      expect(payload.recipientName).toBe("Test Buyer");
      expect(payload.line1).toBe("123 Main St");
    });
  });

  test.describe("updatePayment validation", function () {
    test("rejects with PAYPAL_MISSING_REQUIRED_OPTION when no options are passed", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const err = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;
        try {
          await instance.updatePayment(undefined);
          return null;
        } catch (e) {
          const braintreeErr = e as BraintreeErrorShape;
          return { code: braintreeErr.code };
        }
      })) as BraintreeErrorShape | null;

      expect(err?.code).toBe("PAYPAL_MISSING_REQUIRED_OPTION");
    });

    test("rejects with PAYPAL_INVALID_PAYMENT_OPTION when shippingOption currencies differ", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const err = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;
        try {
          await instance.updatePayment({
            paymentId: "PAY-test",
            currency: "USD",
            amount: "10.00",
            shippingOptions: [
              {
                id: "shipping-1",
                type: "SHIPPING",
                label: "Standard",
                selected: true,
                amount: { currency: "EUR", value: "5.00" },
              },
            ],
          });
          return null;
        } catch (e) {
          const braintreeErr = e as BraintreeErrorShape;
          return { code: braintreeErr.code };
        }
      })) as BraintreeErrorShape | null;

      expect(err?.code).toBe("PAYPAL_INVALID_PAYMENT_OPTION");
    });
  });

  test.describe("updatePayment payload formatting", function () {
    test("sends patch_payment_resource POST with formatted update data", async ({
      paypalCheckoutPage,
      page,
      getTestUrl,
    }) => {
      const captured = await paypalCheckoutPage.setupNetworkCapture();

      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      await page.evaluate(() => {
        const instance = window.__btPayPalCheckout!;
        return instance
          .updatePayment({
            paymentId: "PAY-test-id",
            currency: "USD",
            amount: "20.00",
            lineItems: [
              {
                name: "Item B",
                quantity: "2",
                unitAmount: "10.00",
                kind: "debit",
              },
            ],
            shippingOptions: [
              {
                id: "ship-1",
                type: "SHIPPING",
                label: "Express",
                selected: true,
                amount: { currency: "USD", value: "5.00" },
              },
            ],
            amountBreakdown: {
              itemTotal: "20.00",
              shipping: "5.00",
            },
          })
          .catch(() => null);
      });

      await page.waitForTimeout(TEST_TIMEOUTS.callbackDelay);

      const request = captured.findByUrl(PATCH_PAYMENT_URL);
      expect(request).toBeDefined();

      const payload = request?.body as unknown as UpdatePaymentResourcePayload;

      expect(payload.paymentId).toBe("PAY-test-id");
      expect(payload.currencyIsoCode).toBe("USD");
      expect(payload.amount).toBe("20.00");
      expect(Array.isArray(payload.lineItems)).toBe(true);
      expect(Array.isArray(payload.shippingOptions)).toBe(true);
      expect(payload.amountBreakdown).toBeDefined();
    });
  });

  test.describe("teardown", function () {
    test("resolves and causes subsequent createPayment to reject with teardown error", async ({
      page,
      getTestUrl,
    }) => {
      await page.goto(getTestUrl({ storyUrl: STORY_URLS.oneTimePayment }), {
        waitUntil: "domcontentloaded",
      });

      await waitForInstance(page);

      const result = (await page.evaluate(async () => {
        const instance = window.__btPayPalCheckout!;

        await instance.teardown();

        try {
          await instance.createPayment({ flow: "checkout", amount: "1.00" });
          return { teardownResolved: true, postCallRejected: false };
        } catch (e) {
          const err = e as BraintreeErrorShape;
          return {
            teardownResolved: true,
            postCallRejected: true,
            code: err.code,
            message: err.message,
          };
        }
      })) as {
        teardownResolved: boolean;
        postCallRejected: boolean;
        code?: string;
        message?: string;
      };

      expect(result.teardownResolved).toBe(true);
      expect(result.postCallRejected).toBe(true);
      // `convertMethodsToError` uses METHOD_CALLED_AFTER_TEARDOWN in the
      // shared lib. Don't hard-assert the exact code since it can vary
      // across SDK versions; the message is the stable signal.
      expect((result.message ?? "").toLowerCase()).toMatch(
        /teardown|torn down|no longer/
      );
    });
  });
});
