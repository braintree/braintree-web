import { expect } from "@wdio/globals";
import { getWorkflowUrl } from "./helper";

describe("Tokenize Card", function () {
  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);
  });

  it("should tokenize card successfully with postal code field", async function () {
    const url = getWorkflowUrl(
      "/iframe.html?globals=&args=&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story"
    );

    await browser.url(url);

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
      "/iframe.html?globals=&id=braintree-hosted-fields--standard-hosted-fields&viewMode=story&args=includePostalCode:!false"
    );

    await browser.url(url);

    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("cvv");
    await browser.hostedFieldSendInput("expirationDate");

    await browser.submitPay();

    const result = await browser.getResult();

    await expect(result.success).toBe(true);
  });
});
