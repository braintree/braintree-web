import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Tokenize Card", function () {
  const standardUrl =
    "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";
  const noPostalCodeUrl =
    "/iframe.html?globals=&args=includePostalCode:!false&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";

  let server: http.Server;
  let serverPort: number;

  const getTestUrl = (path: string) => {
    let url = `http://localhost:${serverPort}${path}`;
    if (process.env.LOCAL_BUILD === "true") {
      const hasQuery = url.includes("?");
      const separator = hasQuery ? "&" : "?";
      url = `${url}${separator}globals=sdkVersion:dev`;
    }
    return encodeURI(url);
  };

  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: 30000,
      implicit: 15000,
      script: 60000,
    });

    // Create per-test server
    const result: TestServerResult = await createTestServer();
    server = result.server;
    serverPort = result.port;
  });

  afterEach(async function () {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await browser.reloadSession();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", err.message);
    }
  });

  it("should tokenize card successfully with postal code field", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("postalCode");

    await browser.submitPay();

    const result = await browser.getResult();

    await expect(result.success).toBe(true);
  });

  it("should tokenize card successfully without postal code field", async function () {
    await browser.url(getTestUrl(noPostalCodeUrl));
    await browser.waitForHostedFieldsReady();

    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");

    await browser.waitForFormReady();
    await browser.submitPay();

    const result = await browser.getResult();

    await expect(result.success).toBe(true);
  });
});
