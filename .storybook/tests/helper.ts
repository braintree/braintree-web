/* eslint-disable no-console */
import { $ } from "@wdio/globals";
import { SUCCESS_MESSAGES, DEFAULT_HOSTED_FIELDS_VALUES } from "../constants";

const BASE_URL = "https://127.0.0.1:8080";

const appendOrReplaceParam = (
  url: string,
  paramName: string,
  value: string
) => {
  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";

  return url.includes(`${paramName}=`)
    ? url.replace(new RegExp(`${paramName}=([^&]*)`), `${paramName}=${value}`)
    : `${url}${separator}${paramName}=${value}`;
};

export const getWorkflowUrl = function (path: string) {
  let url = `${BASE_URL}${path}`;

  if (process.env.LOCAL_BUILD === "true") {
    console.log("🔧 LOCAL_BUILD=true detected, modifying URL for local build");
    url = appendOrReplaceParam(url, "globals", "sdkVersion:dev");
    console.log("🔧 Modified URL:", url);
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

    result.success =
      resultElement.includes(SUCCESS_MESSAGES.TOKENIZATION) ||
      resultElement.includes(SUCCESS_MESSAGES.VERIFICATION);

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

  browser.addCommand(
    "hostedFieldClearWithKeypress",
    async function (key: string, deleteCount: number) {
      await browser.waitForHostedField(key);

      await browser.switchFrame($(`#braintree-hosted-field-${key}`));

      const inputField = await $("input");

      await inputField.click();

      // Send individual backspace keypresses with a small delay between them
      // Safari seems to need this sequential approach
      if (deleteCount > 0) {
        for (let i = 0; i < deleteCount; i++) {
          await browser.keys("\uE003"); // Single Backspace key
          await browser.pause(50); // Small delay between keypresses
        }
      }

      await browser.switchFrame(null);

      await browser.pause(300);
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

  browser.addCommand("submitPay", async function () {
    await browser.waitForFormReady();

    const submitButton = await $('button[type="submit"]');
    await submitButton.click();

    await browser.waitUntil(
      async () => {
        const resultDiv = await $("#result");
        const resultClasses = await resultDiv.getAttribute("class");
        return resultClasses.includes("shared-result--visible");
      },
      {
        timeout: 10000,
        timeoutMsg: "Result container never became visible after submit",
      }
    );

    await browser.getResult();
  });
};
