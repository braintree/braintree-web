/* eslint-disable no-console */
import { $, $$ } from "@wdio/globals";
import { DEFAULT_HOSTED_FIELDS_VALUES } from "../../../constants";

export const registerHostedFieldsCommands = (): void => {
  browser.addCommand(
    "waitForHostedFieldsReady",
    async function () {
      await browser.waitUntil(
        async () => {
          const braintreeLoaded = await browser.execute(() => {
            const braintree = window.braintree as
              | { hostedFields?: unknown }
              | undefined;

            return (
              typeof braintree !== "undefined" &&
              braintree.hostedFields &&
              document.querySelectorAll("iframe[id^=braintree-hosted-field]")
                .length > 0
            );
          });

          return braintreeLoaded;
        },
        {
          timeout: 20000,
          timeoutMsg:
            "Braintree SDK or hosted field iframes not found after 20s",
        }
      );

      const hostedFieldIframes = await $$("iframe[id^=braintree-hosted-field]");

      for (const iframe of hostedFieldIframes) {
        const iframeId = await iframe.getAttribute("id");

        await browser.waitUntil(
          async () => {
            try {
              await browser.switchFrame(iframe);
              const inputExists = await $("input").isExisting();
              await browser.switchFrame(null);

              return inputExists;
            } catch (error) {
              console.error(`Error checking iframe ${iframeId}:`, error);
              await browser.switchFrame(null);

              return false;
            }
          },
          {
            timeout: 10000,
            timeoutMsg: `Hosted field ${iframeId} input not ready after 10s`,
          }
        );
      }
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "waitForHostedField",
    async function (fieldKey: string) {
      const hostedFieldIframe = await $(`#braintree-hosted-field-${fieldKey}`);
      await hostedFieldIframe.waitForExist({ timeout: 10000 });

      await browser.waitUntil(
        async () => {
          try {
            await browser.switchFrame(hostedFieldIframe);
            const inputExists = await $("input").isExisting();
            await browser.switchFrame(null);

            return inputExists;
          } catch (error) {
            console.error(error);
            await browser.switchFrame(null);

            return false;
          }
        },
        {
          timeout: 10000,
          timeoutMsg: `Hosted field ${fieldKey} not ready for interaction after 10s`,
        }
      );
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "hostedFieldSendInput",
    async function (fieldKey: string, value: string) {
      await browser.waitForHostedField(fieldKey);

      let updatedValue = value;

      if (!updatedValue) {
        updatedValue =
          DEFAULT_HOSTED_FIELDS_VALUES[
            fieldKey as keyof typeof DEFAULT_HOSTED_FIELDS_VALUES
          ];
      }

      await browser.switchFrame($(`#braintree-hosted-field-${fieldKey}`));
      await $("input").setValue(updatedValue);
      await browser.switchFrame(null);
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "hostedFieldClearWithKeypress",
    async function (fieldKey: string, deleteCount: number) {
      await browser.waitForHostedField(fieldKey);

      await browser.switchFrame($(`#braintree-hosted-field-${fieldKey}`));

      const inputField = await $("input");

      await inputField.click();

      if (deleteCount > 0) {
        for (
          let keypressIndex = 0;
          keypressIndex < deleteCount;
          keypressIndex++
        ) {
          await browser.keys("\uE003");
          await browser.pause(50);
        }
      }

      await browser.switchFrame(null);

      await browser.pause(300);
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "waitForFormReady",
    async function () {
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
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "submitPay",
    async function () {
      await browser.waitForFormReady();

      const submitButton = await $('button[type="submit"]');
      await submitButton.click();

      await browser.waitUntil(
        async () => {
          const resultContainer = await $("#result");
          const resultClasses = await resultContainer.getAttribute("class");

          return resultClasses.includes("shared-result--visible");
        },
        {
          timeout: 10000,
          timeoutMsg: "Result container never became visible after submit",
        }
      );

      await browser.getResult();
    },
    { attachToElement: false }
  );
};
