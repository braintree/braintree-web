import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields Validation States", function () {
  const standardUrl =
    "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";

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

    await browser.url(getTestUrl(standardUrl));
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

  it("should show invalid state for incorrect card number", async function () {
    await browser.hostedFieldSendInput("number", "4111 1111 1111 1111111");

    await browser.waitForHostedField("number");
    const cardNumberContainer = await $("#card-number");
    const containerClasses = await cardNumberContainer.getAttribute("class");

    await expect(containerClasses).toContain("braintree-hosted-fields-invalid");
    await expect(containerClasses).not.toContain(
      "braintree-hosted-fields-valid"
    );

    const submitButton = await $('button[type="submit"]');
    const isButtonDisabled = await submitButton.getAttribute("disabled");
    await expect(isButtonDisabled).toBe("true");
  });

  it("should show valid state for correct inputs", async function () {
    await browser.hostedFieldSendInput("number");

    await browser.waitForHostedField("number");
    const cardNumberContainer = await $("#card-number");
    const containerClasses = await cardNumberContainer.getAttribute("class");

    await expect(containerClasses).toContain("braintree-hosted-fields-valid");
    await expect(containerClasses).not.toContain(
      "braintree-hosted-fields-invalid"
    );
  });

  it("should validate expired date", async function () {
    const pastDate = "12/21";
    await browser.hostedFieldSendInput("expirationDate", pastDate);

    await browser.waitForHostedField("expirationDate");
    const expirationContainer = await $("#expiration-date");
    const containerClasses = await expirationContainer.getAttribute("class");

    await expect(containerClasses).toContain("braintree-hosted-fields-invalid");

    const submitButton = await $('button[type="submit"]');
    const isButtonDisabled = await submitButton.getAttribute("disabled");
    await expect(isButtonDisabled).toBe("true");
  });

  it("should validate CVV length based on card type", async function () {
    await browser.hostedFieldSendInput("number", "4111111111111111");
    await browser.hostedFieldSendInput("cvv", "123");

    const cvvContainer = await $("#cvv");
    let containerClasses = await cvvContainer.getAttribute("class");

    await expect(containerClasses).toContain("braintree-hosted-fields-valid");

    await browser.hostedFieldSendInput("number", "378282246310005");

    containerClasses = await cvvContainer.getAttribute("class");
    await expect(containerClasses).not.toContain(
      "braintree-hosted-fields-valid"
    );

    await browser.hostedFieldSendInput("cvv", "1234");

    containerClasses = await cvvContainer.getAttribute("class");
    await expect(containerClasses).toContain("braintree-hosted-fields-valid");
  });

  it("should enforce postal code format validation", async function () {
    await browser.hostedFieldSendInput("postalCode", "1");

    const postalCodeContainer = await $("#postal-code");
    let containerClasses = await postalCodeContainer.getAttribute("class");

    await expect(containerClasses).not.toContain(
      "braintree-hosted-fields-valid"
    );

    await browser.hostedFieldSendInput("postalCode", "12345");

    containerClasses = await postalCodeContainer.getAttribute("class");
    await expect(containerClasses).toContain("braintree-hosted-fields-valid");
  });

  it("should show focus state on active field", async function () {
    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    await inputField.click();

    await browser.switchFrame(null);

    const numberContainer = await $("#card-number");
    const containerClasses = await numberContainer.getAttribute("class");

    await expect(containerClasses).toContain("braintree-hosted-fields-focused");
  });
});
