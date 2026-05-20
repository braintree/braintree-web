import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Configuration and browser support tests.
 *
 * These tests navigate to a Venmo story to load the SDK, then use
 * page.evaluate to call braintree.venmo.create / isBrowserSupported
 * with various configurations. This validates the SDK's client-side
 * config checking without requiring separate stories for each combo.
 *
 * The configuration validation tests reuse the story's already-
 * authenticated client (exposed on window.__testClient by setupMocks)
 * rather than creating a second client, avoiding authorization issues.
 *
 * Mocking strategy:
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Route interception (standard mocks)
 */

test.describe("Venmo Configuration Validation", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await venmoPage.waitForSdkReady();
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
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
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await venmoPage.waitForSdkReady();
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
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

test.describe("Venmo Browser Support - Edge Cases", function () {
  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("Venmo shows unsupported error when browser detection fails", async ({
    venmoPage,
    getTestUrl,
    page,
  }) => {
    await venmoPage.setupMocks();

    await page.addInitScript(() => {
      const checkAndMock = setInterval(() => {
        if (window.braintree?.venmo?.create) {
          clearInterval(checkAndMock);
          const originalVenmoCreate = window.braintree.venmo.create;

          window.braintree.venmo.create = async function (options: any) {
            const instance = await originalVenmoCreate.call(this, options);

            instance.isBrowserSupported = () => false;

            return instance;
          };
        }
      }, 10);
    });

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null &&
          result.classList.contains("shared-result--error") &&
          result.classList.contains("shared-result--visible")
        );
      },
      { timeout: 35000 }
    );

    const resultText = await page.locator("#result").textContent();

    expect(resultText).toContain("Browser does not support Venmo");
  });
});
