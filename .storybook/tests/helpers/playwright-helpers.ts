import { test as base, type Page } from "@playwright/test";

import {
  createTestServer,
  TestServerOptions,
  type TestServerResult,
} from "./test-server";
import { HostedFieldsPage } from "./hosted-fields-page";
import { startMultiFrameJSCoverage } from "./integration-coverage-cdp";
import { mergePlaywrightV8Coverage } from "./integration-coverage-store";
import { PayPalCheckoutPage } from "./paypal-checkout-page";
import { ThreeDSecurePage } from "./three-d-secure-page";
import { VenmoPage } from "./venmo-page";

export const test = base.extend<{
  hostedFieldsPage: HostedFieldsPage;
  paypalCheckoutPage: PayPalCheckoutPage;
  venmoPage: VenmoPage;
  threeDSecurePage: ThreeDSecurePage;
  testServerOptions: TestServerOptions;
  testServer: TestServerResult;
  getTestUrl: (_urlOpts: {
    noPostalCode?: boolean;
    lightTheme?: boolean;
    darkTheme?: boolean;
    cvvOnly?: boolean;
    amexUrl?: boolean;
    csp?: boolean;
    useMinified?: boolean;
    cardholderName?: boolean;
    applePay?: boolean;
    venmoDesktopWeb?: boolean;
    venmoDesktopQR?: boolean;
    googlePay?: boolean;
    useHttps?: boolean;
    storyUrl?: string;
    threeDSecure?: boolean;
    client?: boolean;
    dataCollector?: boolean;
    dataCollectorCustomId?: boolean;
    dataCollectorDeferred?: boolean;
    dataCollectorMultiple?: boolean;
    dataCollectorLifecycle?: boolean;
    dataCollectorErrors?: boolean;
    americanExpress?: boolean;
    americanExpressExpressCheckout?: boolean;
    americanExpressErrors?: boolean;
    americanExpressLifecycle?: boolean;
  }) => string;
  _integrationCoverage: void;
}>({
  _integrationCoverage: [
    async ({ page }, use) => {
      const enabled =
        process.env.PLAYWRIGHT_INTEGRATION_COVERAGE === "true" &&
        page.context().browser()?.browserType().name() === "chromium";

      if (!enabled) {
        await use();

        return;
      }

      await finishAndMergeCoverageForPage(page);

      const session = await startMultiFrameJSCoverage(page, {
        resetOnNavigation: false,
        reportAnonymousScripts: true,
      });

      multiFrameCoverageSessionByPage.set(page, session);

      if (!originalPageReloadByPage.has(page)) {
        originalPageReloadByPage.set(page, page.reload.bind(page));

        // Monkey-patch page.reload to flush V8 coverage before navigation.
        // Playwright does not guarantee afterEach hook ordering relative to
        // auto fixtures, so tests calling page.reload() in afterEach would
        // destroy the CDP coverage session before the fixture can collect it.
        // A wrapper function tests call instead wouldn't cover third-party or
        // existing afterEach hooks. This override ensures coverage is always
        // flushed regardless of hook execution order.
        page.reload = async (options?: Parameters<Page["reload"]>[0]) => {
          await finishAndMergeCoverageForPage(page);
          const orig = originalPageReloadByPage.get(page);
          const response = orig
            ? await orig(options)
            : await Object.getPrototypeOf(page).reload.call(page, options);

          const newSession = await startMultiFrameJSCoverage(page, {
            resetOnNavigation: false,
            reportAnonymousScripts: true,
          });

          multiFrameCoverageSessionByPage.set(page, newSession);

          return response;
        };
      }

      await use();

      await finishAndMergeCoverageForPage(page);
    },
    { auto: true },
  ],

  testServerOptions: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use({});
    },
    { option: true },
  ],

  testServer: [
    async ({ testServerOptions }, use) => {
      const server = await createTestServer(testServerOptions);
      await use(server);
      server.server.close();
    },
    { option: false },
  ],

  getTestUrl: async ({ testServer }, use) => {
    const getUrl = (urlOpts: {
      noPostalCode?: boolean;
      lightTheme?: boolean;
      darkTheme?: boolean;
      cvvOnly?: boolean;
      amexUrl?: boolean;
      csp?: boolean;
      useMinified?: boolean;
      cardholderName?: boolean;
      applePay?: boolean;
      venmoDesktopWeb?: boolean;
      venmoDesktopQR?: boolean;
      googlePay?: boolean;
      useHttps?: boolean;
      storyUrl?: string;
      client?: boolean;
      threeDSecure?: boolean;
      dataCollector?: boolean;
      dataCollectorCustomId?: boolean;
      dataCollectorDeferred?: boolean;
      dataCollectorMultiple?: boolean;
      dataCollectorLifecycle?: boolean;
      dataCollectorErrors?: boolean;
      americanExpress?: boolean;
      americanExpressExpressCheckout?: boolean;
      americanExpressErrors?: boolean;
      americanExpressLifecycle?: boolean;
    }) => {
      const protocol = urlOpts.useHttps ? "https" : "http";

      const storyPaths: Record<string, string | (() => string)> = {
        noPostalCode:
          "/iframe.html?globals=&args=includePostalCode:!false&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story",
        lightTheme:
          "/iframe.html?id=braintree-hosted-fields-custom-styling--light-theme&viewMode=story",
        darkTheme:
          "/iframe.html?id=braintree-hosted-fields-custom-styling--dark-theme&viewMode=story",
        cvvOnly:
          "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&viewMode=story",
        amexUrl:
          "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&args=cardType:amex&viewMode=story",
        cardholderName:
          "/iframe.html?id=braintree-hosted-fields-cardholder-name--cardholder-name-field&viewMode=story",
        csp: () => {
          const useMinified = urlOpts.useMinified ?? false;
          return `/iframe.html?globals=&args=&id=braintree-hosted-fields--hosted-fields-csp-test&viewMode=story&useMinified=${useMinified}`;
        },
        applePay:
          "/iframe.html?id=braintree-apple-pay--apple-pay&viewMode=story",
        venmoDesktopWeb:
          "/iframe.html?id=braintree-venmo--desktop-web&viewMode=story",
        venmoDesktopQR:
          "/iframe.html?id=braintree-venmo--desktop-qr&viewMode=story",
        googlePay:
          "/iframe.html?id=braintree-google-pay--google-pay&viewMode=story",
        threeDSecure:
          "/iframe.html?id=braintree-3d-secure--three-d-secure&viewMode=story",
        client:
          "/iframe.html?id=braintree-client--client-initialization&viewMode=story",
        dataCollector:
          "/iframe.html?id=braintree-data-collector--standard-data-collection&viewMode=story",
        dataCollectorCustomId:
          "/iframe.html?id=braintree-data-collector--custom-correlation-id&viewMode=story",
        dataCollectorDeferred:
          "/iframe.html?id=braintree-data-collector--deferred-client-setup&viewMode=story",
        dataCollectorMultiple:
          "/iframe.html?id=braintree-data-collector--multiple-instances&viewMode=story",
        dataCollectorLifecycle:
          "/iframe.html?id=braintree-data-collector--component-lifecycle&viewMode=story",
        dataCollectorErrors:
          "/iframe.html?id=braintree-data-collector--error-handling&viewMode=story",
        americanExpress:
          "/iframe.html?id=braintree-american-express--rewards-balance&viewMode=story",
        americanExpressExpressCheckout:
          "/iframe.html?id=braintree-american-express--express-checkout-profile&viewMode=story",
        americanExpressErrors:
          "/iframe.html?id=braintree-american-express--error-handling&viewMode=story",
        americanExpressLifecycle:
          "/iframe.html?id=braintree-american-express--component-lifecycle&viewMode=story",
      };

      const matchedKey = Object.keys(storyPaths).find(
        (key) => urlOpts[key as keyof typeof urlOpts]
      );

      let path: string;
      if (matchedKey) {
        const entry = storyPaths[matchedKey];
        path = typeof entry === "function" ? entry() : entry;
      } else if (urlOpts.storyUrl) {
        path = urlOpts.storyUrl;
      } else {
        path =
          "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";
      }

      let url = `${protocol}://localhost:${testServer.port}${path}`;
      const hasQueryForSdkVersion = url.includes("?");
      const sdkVersionSeparator = hasQueryForSdkVersion ? "&" : "?";
      url = `${url}${sdkVersionSeparator}globals=sdkVersion:dev`;

      if (process.env.PLAYWRIGHT_INTEGRATION_COVERAGE === "true") {
        const hasQuery = url.includes("?");
        const separator = hasQuery ? "&" : "?";
        url = `${url}${separator}integrationCoverage=1`;
      }

      return encodeURI(url);
    };

    await use(getUrl);
  },

  hostedFieldsPage: async ({ page }, use) => {
    await use(new HostedFieldsPage(page));
  },

  paypalCheckoutPage: async ({ page }, use) => {
    const paypalPage = new PayPalCheckoutPage(page);
    await use(paypalPage);
    await paypalPage.closePopup();
  },

  venmoPage: async ({ page }, use) => {
    const venmo = new VenmoPage(page);

    await use(venmo);
    await venmo.closePopup();
  },

  threeDSecurePage: async ({ page }, use) => {
    await use(new ThreeDSecurePage(page));
  },
});

/** Per-page multi-frame CDP coverage session (WeakMap so pages are not retained). */
const multiFrameCoverageSessionByPage = new WeakMap<
  Page,
  Awaited<ReturnType<typeof startMultiFrameJSCoverage>>
>();

/** Original `page.reload` before we wrap it to flush coverage before navigation. */
const originalPageReloadByPage = new WeakMap<Page, Page["reload"]>();

async function finishAndMergeCoverageForPage(page: Page): Promise<void> {
  const coverageSession = multiFrameCoverageSessionByPage.get(page);

  if (!coverageSession) {
    return;
  }

  multiFrameCoverageSessionByPage.delete(page);

  try {
    const entries = await coverageSession.finish();

    await mergePlaywrightV8Coverage(entries);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[integration-coverage] multi-frame stop failed:", err);
  }
}
