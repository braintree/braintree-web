import { $ } from "@wdio/globals";

const BASE_URL = "https://127.0.0.1:8080";
const yearInFuture = (new Date().getFullYear() % 100) + 3; // current year + 3
const DEFAULT_HOSTED_FIELDS_VALUES = {
  number: "4111111111111111",
  expirationDate: `12/${yearInFuture}`,
  cvv: "123",
  postalCode: "12345",
};

export const getWorkflowUrl = function (path: string) {
  const url = encodeURI(`${BASE_URL}${path}`);

  return url;
};

export const loadHelpers = function () {
  browser.addCommand(
    "reloadSessionOnRetry",
    async (test: { _currentRetry: number }) => {
      if (test._currentRetry > 0) {
        await browser.reloadSession();
      }
    }
  );

  browser.addCommand("getResult", async function () {
    const result = {
      success: false,
    };

    await $("#result").waitForExist();
    const resultElement = await $("#result").getText();

    result.success = resultElement
      .trim()
      .includes("Payment tokenized successfully!");

    return result;
  });

  browser.addCommand(
    "hostedFieldSendInput",
    async function (key: string, value: string) {
      await $(`#braintree-hosted-field-${key}`).waitForExist();
      let updatedValue = value;

      if (!updatedValue) {
        updatedValue = DEFAULT_HOSTED_FIELDS_VALUES[key];
      }

      await browser.switchFrame($(`#braintree-hosted-field-${key}`));
      await $("input").setValue(updatedValue);

      await browser.switchFrame(null);
    }
  );

  browser.addCommand("submitPay", async function (waitForResult = true) {
    await $('button[type="submit"]').waitForEnabled();
    await $('button[type="submit"]').click();

    if (waitForResult) {
      // to not resolve submitPay until result is finished
      await browser.getResult();
    }
  });
};
