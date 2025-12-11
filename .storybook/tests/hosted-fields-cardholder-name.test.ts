import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields with Cardholder Name", function () {
  const cardholderNameUrl =
    "/iframe.html?id=braintree-hosted-fields-cardholder-name--cardholder-name-field&viewMode=story";

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

    await browser.url(getTestUrl(cardholderNameUrl));
    await browser.waitForHostedFieldsReady();
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

  it("should tokenize card with cardholder name successfully", async function () {
    // Fill all fields
    await browser.hostedFieldSendInput("cardholderName", "John Doe");
    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("postalCode");

    await browser.submitPay();

    const result = await browser.getResult();
    await expect(result.success).toBe(true);

    // Check if result contains cardholder name
    const resultText = await $("#result").getText();
    await expect(resultText).toContain("Cardholder Name: John Doe");
  });

  it("should show cardholder name validation states", async function () {
    // Test empty state
    await browser.waitForHostedField("cardholderName");
    await browser.switchFrame(
      await $("#braintree-hosted-field-cardholderName")
    );
    const isEmpty = (await $("input").getValue()) === "";
    await browser.switchFrame(null);
    await expect(isEmpty).toBe(true);

    // Fill cardholder name and check valid state
    await browser.hostedFieldSendInput("cardholderName", "John Doe");

    // Fill other fields for form completion
    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("postalCode");

    // The form should be valid now
    const submitButton = await $('button[type="submit"]');
    await submitButton.waitForEnabled({ timeout: 5000 });

    // Button should have the success class when form is valid
    const hasSuccessClass = await submitButton.getAttribute("class");
    await expect(hasSuccessClass).toContain("submit-button--success");
  });

  it("should verify button remains disabled when cardholder name is empty", async function () {
    // Fill all fields except cardholder name
    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("postalCode");

    // Wait to ensure validation has time to run
    await browser.pause(1000);

    // Verify the button is still disabled
    const submitButton = await $('button[type="submit"]');
    const isDisabled = await submitButton.getAttribute("disabled");

    // Button should be disabled when cardholder name is empty
    await expect(isDisabled).toBe("true");

    // Verify button doesn't have success class
    const buttonClasses = await submitButton.getAttribute("class");
    await expect(buttonClasses).not.toContain("submit-button--success");
  });
});
