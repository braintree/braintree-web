import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields Events", function () {
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

  it("should detect card type change event", async function () {
    const cardTypeContainer = await $("#card-type");
    await browser.hostedFieldSendInput("number", "4");
    let cardTypeResult = await cardTypeContainer.getText();
    expect(cardTypeResult).toContain("Visa");

    await browser.hostedFieldSendInput("number", "34");
    cardTypeResult = await cardTypeContainer.getText();
    expect(cardTypeResult).toContain("American Express");
  });

  it("should track empty and notEmpty events", async function () {
    const emptyEventContainer = await $("#emptyEvent");
    const notEmptyEventContainer = await $("#notEmptyEvent");

    await browser.hostedFieldSendInput("number", "4111");
    const notEmptyContainerClasses =
      await notEmptyEventContainer.getAttribute("class");
    expect(notEmptyContainerClasses).toContain("number");

    await browser.hostedFieldClearWithKeypress("number", 4);

    const emptyContainerClasses =
      await emptyEventContainer.getAttribute("class");
    expect(emptyContainerClasses).toContain("number");
  });

  it("should track focus and blur events", async function () {
    const focusEventContainer = await $("#focus");
    const blurEventContainer = await $("#blur");

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));
    const inputField = await $("input");
    await inputField.click();
    await browser.switchFrame(null);
    await browser.pause(300);

    let focusContainerClasses = await focusEventContainer.getAttribute("class");
    expect(focusContainerClasses).toContain("number");

    await browser.waitForHostedField("cvv");
    await browser.switchFrame(await $("#braintree-hosted-field-cvv"));
    const cvvField = await $("input");
    await cvvField.click();
    await browser.switchFrame(null);

    await browser.pause(300);

    const blurContainerClasses = await blurEventContainer.getAttribute("class");
    expect(blurContainerClasses).toContain("number");

    focusContainerClasses = await focusEventContainer.getAttribute("class");
    expect(focusContainerClasses).toContain("cvv");
  });

  it("should handle inputSubmitRequest event", async function () {
    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("postalCode");

    await browser.waitForHostedField("postalCode");
    await browser.switchFrame(await $("#braintree-hosted-field-postalCode"));
    await browser.keys("\uE007"); // Press Enter key
    await browser.switchFrame(null); // Exit the iframe to access parent document elements

    await browser.pause(300);

    const inputSubmitRequestContainer = await $("#inputSubmitRequest");
    const inputSubmitRequestClasses =
      await inputSubmitRequestContainer.getAttribute("class");
    expect(inputSubmitRequestClasses).toContain("postalCode");
  });

  it("should emit binAvailable event when BIN can be determined", async function () {
    const binAvailableContainer = await $("#binAvailable");
    await browser.hostedFieldSendInput("number", "411111");
    const binAvailableResult =
      await binAvailableContainer.getAttribute("binAvailable");
    expect(binAvailableResult).toBe("true");
  });
});
