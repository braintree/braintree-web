import { expect } from "@wdio/globals";
import { getWorkflowUrl } from "./helper";

describe("Tokenize Card", function () {
  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: 30000,
      implicit: 15000,
      script: 60000,
    });
  });

  it("should tokenize card successfully with postal code field", async function () {
    const url = getWorkflowUrl(
      "/iframe.html?globals=&args=&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story"
    );

    await browser.url(url);

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
    const url = getWorkflowUrl(
      "/iframe.html?globals=&args=includePostalCode:!false&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story"
    );

    await browser.url(url);

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
