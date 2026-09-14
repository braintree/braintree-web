import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import { cleanupAfterTest } from "../helpers/shared-waiters";

test.describe("Venmo Configuration Validation", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await venmoPage.waitForSdkReady();
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should reject create() without paymentMethodUsage", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        // @ts-expect-error -- intentionally omitting paymentMethodUsage to test SDK validation
        await window.braintree!.venmo.create({ client });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_PAYMENT_METHOD_USAGE_REQUIRED");
  });

  test("should reject create() with invalid paymentMethodUsage", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        await window.braintree!.venmo.create({
          client,
          // @ts-expect-error -- intentionally passing invalid enum value to test SDK validation
          paymentMethodUsage: "invalid_value",
        });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_INVALID_PAYMENT_METHOD_USAGE");
  });

  test("should reject create() with single_use but no totalAmount", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        await window.braintree!.venmo.create({
          client,
          paymentMethodUsage: "single_use",
        });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_TOTAL_AMOUNT_REQUIRED");
  });

  test("should reject create() with invalid profileId type", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        await window.braintree!.venmo.create({
          client,
          paymentMethodUsage: "multi_use",
          // @ts-expect-error -- intentionally passing number to test SDK type validation
          profileId: 12345,
        });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_INVALID_PROFILE_ID");
  });

  test("should reject create() with invalid deepLinkReturnUrl type", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        await window.braintree!.venmo.create({
          client,
          paymentMethodUsage: "multi_use",
          // @ts-expect-error -- intentionally passing number to test SDK type validation
          deepLinkReturnUrl: 12345,
        });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_INVALID_DEEP_LINK_RETURN_URL");
  });

  test("should reject create() with invalid riskCorrelationId type", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const error = await page.evaluate(async () => {
      try {
        const client = window.__testClient;

        if (!client) throw new Error("Story client not available");

        await window.braintree!.venmo.create({
          client,
          paymentMethodUsage: "multi_use",
          // @ts-expect-error -- intentionally passing number to test SDK type validation
          riskCorrelationId: 12345,
        });

        return null;
      } catch (err: any) {
        return {
          code: err.code,
          type: err.type,
          message: err.message,
          name: err.name,
          keys: Object.keys(err),
        };
      }
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("VENMO_INVALID_RISK_CORRELATION_ID");
  });
});

test.describe("Venmo Browser Support Detection", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await venmoPage.waitForSdkReady();
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("static isBrowserSupported returns boolean", async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
      });
    });

    expect(result).toBe("boolean");
  });

  test("isBrowserSupported returns true with allowDesktop on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported returns true with allowDesktopWebLogin on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktopWebLogin: true,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported returns false without desktop flags on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({});
    });

    expect(supported).toBe(false);
  });

  test("isBrowserSupported with allowWebviews:false on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
        allowWebviews: false,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported with allowNonDefaultBrowsers:false on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
        allowNonDefaultBrowsers: false,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported with allowNewBrowserTab:false on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
        allowNewBrowserTab: false,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported with combined restrictive options on desktop", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowDesktop: true,
        allowWebviews: false,
        allowNewBrowserTab: false,
        allowNonDefaultBrowsers: false,
      });
    });

    expect(supported).toBe(true);
  });

  test("isBrowserSupported returns false with all restrictive options and no desktop flag", async ({
    page,
  }) => {
    const supported = await page.evaluate(() => {
      return window.braintree!.venmo.isBrowserSupported({
        allowWebviews: false,
        allowNewBrowserTab: false,
        allowNonDefaultBrowsers: false,
      });
    });

    expect(supported).toBe(false);
  });
});
