/* eslint-disable no-console */
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
  let url = `${BASE_URL}${path}`;

  if (process.env.LOCAL_BUILD === "true") {
    console.log("🔧 LOCAL_BUILD=true detected, modifying URL for local build");
    console.log("🔧 Original URL:", url);

    if (url.includes("globals=&")) {
      url = url.replace("globals=&", "globals=sdkVersion:dev&");
    } else if (url.includes("globals=")) {
      url = url.replace(/globals=([^&]*)/, "globals=sdkVersion:dev");
    } else {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}globals=sdkVersion:dev`;
    }

    console.log("🔧 Modified URL:", url);
  } else {
    console.log("🔧 LOCAL_BUILD not set, using default CDN build");
    console.log("🔧 URL:", url);
  }

  return encodeURI(url);
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

  browser.addCommand("waitForHostedFieldsReady", async function () {
    await browser.waitUntil(
      async () => {
        const braintreeLoaded = await browser.execute(() => {
          return (
            typeof window.braintree !== "undefined" &&
            window.braintree.hostedFields &&
            document.querySelectorAll("iframe[id^=braintree-hosted-field]")
              .length > 0
          );
        });
        return braintreeLoaded;
      },
      {
        timeout: 20000,
        timeoutMsg: "Braintree hosted fields not initialized after 20s",
      }
    );
  });

  browser.addCommand("waitForHostedField", async function (key: string) {
    const iframe = await $(`#braintree-hosted-field-${key}`);
    await iframe.waitForExist({ timeout: 10000 });

    await browser.waitUntil(
      async () => {
        try {
          await browser.switchFrame(iframe);
          const inputExists = await $("input").isExisting();
          await browser.switchFrame(null);
          return inputExists;
        } catch (e) {
          console.error(e);
          await browser.switchFrame(null);
          return false;
        }
      },
      {
        timeout: 10000,
        timeoutMsg: `Hosted field ${key} not ready for interaction after 10s`,
      }
    );
  });

  browser.addCommand(
    "hostedFieldSendInput",
    async function (key: string, value: string) {
      await browser.waitForHostedField(key);

      let updatedValue = value;
      if (!updatedValue) {
        updatedValue = DEFAULT_HOSTED_FIELDS_VALUES[key];
      }

      await browser.switchFrame($(`#braintree-hosted-field-${key}`));
      await $("input").setValue(updatedValue);
      await browser.switchFrame(null);
    }
  );

  browser.addCommand("waitForFormReady", async function () {
    const submitButton = await $('button[type="submit"]');

    await browser.waitUntil(
      async () => {
        return !(await submitButton.getAttribute("disabled"));
      },
      {
        timeout: 15000,
        timeoutMsg:
          "Form submit button not enabled after 15s - form validation may have failed",
      }
    );
  });

  browser.addCommand("submitPay", async function (waitForResult = true) {
    await browser.waitForFormReady();

    const submitButton = await $('button[type="submit"]');
    await submitButton.click();

    if (waitForResult) {
      await browser.waitUntil(
        async () => {
          const buttonText = await submitButton.getText();
          return buttonText.includes("Processing");
        },
        {
          timeout: 5000,
          timeoutMsg: "Submit button did not change to processing state",
        }
      );

      await browser.getResult();
    }
  });
};
