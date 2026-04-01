import { test as base } from "playwright/test";

import {
  createTestServer,
  TestServerOptions,
  type TestServerResult,
} from "./test-server";
import { HostedFieldsPage } from "./hosted-fields-page";

export const test = base.extend<{
  hostedFieldsPage: HostedFieldsPage;
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
    useHttps?: boolean;
  }) => string;
}>({
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
      useHttps?: boolean;
    }) => {
      const protocol = urlOpts.useHttps ? "https" : "http";
      // default path is the standard url
      let path =
        "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";

      if (urlOpts.noPostalCode) {
        path =
          "/iframe.html?globals=&args=includePostalCode:!false&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";
      } else if (urlOpts.lightTheme) {
        path =
          "/iframe.html?id=braintree-hosted-fields-custom-styling--light-theme&viewMode=story";
      } else if (urlOpts.darkTheme) {
        path =
          "/iframe.html?id=braintree-hosted-fields-custom-styling--dark-theme&viewMode=story";
      } else if (urlOpts.cvvOnly) {
        path =
          "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&viewMode=story";
      } else if (urlOpts.amexUrl) {
        path =
          "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&args=cardType:amex&viewMode=story";
      } else if (urlOpts.cardholderName) {
        path =
          "/iframe.html?id=braintree-hosted-fields-cardholder-name--cardholder-name-field&viewMode=story";
      } else if (urlOpts.csp) {
        const useMinified = urlOpts.useMinified ?? false;
        path = `/iframe.html?globals=&args=&id=braintree-hosted-fields--hosted-fields-csp-test&viewMode=story&useMinified=${useMinified}`;
      } else if (urlOpts.applePay) {
        path = "/iframe.html?id=braintree-apple-pay--apple-pay&viewMode=story";
      }

      let url = `${protocol}://localhost:${testServer.port}${path}`;
      if (process.env.LOCAL_BUILD === "true") {
        const hasQuery = url.includes("?");
        const separator = hasQuery ? "&" : "?";
        url = `${url}${separator}globals=sdkVersion:dev`;
      }

      return encodeURI(url);
    };

    await use(getUrl);
  },

  hostedFieldsPage: async ({ page }, use) => {
    await use(new HostedFieldsPage(page));
  },
});
