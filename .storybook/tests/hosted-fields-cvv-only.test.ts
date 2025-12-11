import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields CVV-Only", function () {
  const standardUrl =
    "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&viewMode=story";
  const amexUrl =
    "/iframe.html?id=braintree-hosted-fields-cvv-only--cvv-only-verification&args=cardType:amex&viewMode=story";

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

  it("should tokenize CVV-only field successfully", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    await browser.hostedFieldSendInput("cvv", "123");
    await browser.submitPay();

    const result = await browser.getResult();
    await expect(result.success).toBe(true);
  });

  it("should show validation states for CVV field", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("cvv");
    await browser.switchFrame(await $("#braintree-hosted-field-cvv"));
    const isEmpty = (await $("input").getValue()) === "";
    await browser.switchFrame(null);
    await expect(isEmpty).toBe(true);

    await browser.hostedFieldSendInput("cvv", "1");
    await browser.pause(1000);

    const submitButton = await $('button[type="submit"]');

    // Check if button is disabled - could be either "true" attribute or disabled property
    const isDisabled = await browser.execute(() => {
      const button = document.querySelector('button[type="submit"]');
      return button.disabled === true;
    });

    await expect(isDisabled).toBe(true);

    await browser.hostedFieldSendInput("cvv", "123");
    await submitButton.waitForEnabled({ timeout: 5000 });

    const buttonClasses = await submitButton.getAttribute("class");
    await expect(buttonClasses).toContain("submit-button--success");
  });

  it("should tokenize with 4-digit CVV for American Express", async function () {
    await browser.url(getTestUrl(amexUrl));

    await browser.waitForHostedFieldsReady();

    // Enter a 4-digit CVV for Amex
    await browser.hostedFieldSendInput("cvv", "1234");
    await browser.pause(1000);

    const submitButton = await $('button[type="submit"]');
    await submitButton.click();
    await browser.pause(3000);

    const resultElement = await $("#result");
    await resultElement.waitForExist({ timeout: 10000 });

    const resultText = await resultElement.getText();
    expect(resultText).toContain("verified successfully");
    expect(resultText).toContain("Nonce:");
  });
});
