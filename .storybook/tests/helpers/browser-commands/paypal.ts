import { $ } from "@wdio/globals";
import { PAYPAL_SUCCESS_MESSAGES } from "../../../constants";

export const registerPayPalCommands = (): void => {
  browser.addCommand(
    "waitForPayPalButtonReady",
    async function () {
      await browser.waitUntil(
        async () => {
          const paypalButton = $(".paypal-button");

          const paypalButtonIsClickable = await paypalButton.isClickable();

          return paypalButtonIsClickable;
        },
        {
          timeout: 20000,
          timeoutMsg: "PayPal button not ready after 20s",
        }
      );
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "clickPayPalButton",
    async function () {
      await browser.waitForPayPalButtonReady();
      const paypalButton = $(".paypal-button");
      await paypalButton.click();
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "getPayPalResult",
    async function () {
      await browser.waitUntil(
        async () => {
          const resultContainer = await $("#result");

          const resultClasses = await resultContainer.getAttribute("class");

          return (
            resultClasses && resultClasses.includes("shared-result--visible")
          );
        },
        {
          timeout: 30000,
          timeoutMsg: "PayPal result not visible after 60s",
        }
      );

      const resultContainer = $("#result");
      const resultClasses = await resultContainer.getAttribute("class");
      const resultText = await resultContainer.getText();

      return {
        success: resultClasses.includes("shared-result--success"),
        cancelled: resultText.includes(PAYPAL_SUCCESS_MESSAGES.CANCELLED),
        error: resultClasses.includes("shared-result--error"),
        text: resultText,
      };
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "getBillingAgreementResult",
    async function () {
      await browser.waitUntil(
        async () => {
          const resultContainer = await $("#result");
          const resultClasses = await resultContainer.getAttribute("class");

          return (
            resultClasses && resultClasses.includes("shared-result--visible")
          );
        },
        {
          timeout: 60000,
          timeoutMsg: "Billing agreement result not visible after 60s",
        }
      );

      const resultContainer = $("#result");
      const resultClasses = await resultContainer.getAttribute("class");
      const resultText = await resultContainer.getText();

      return {
        success: resultClasses.includes("shared-result--success"),
        cancelled:
          resultText.includes("Cancelled") || resultText.includes("cancelled"),
        error: resultClasses.includes("shared-result--error"),
        text: resultText,
        hasNonce: resultText.includes("Nonce:"),
        hasEmail:
          resultText.includes("Email:") || resultText.includes("Payer Email:"),
        hasPlanType: /RECURRING|SUBSCRIPTION|UNSCHEDULED|INSTALLMENTS/.test(
          resultText
        ),
      };
    },
    { attachToElement: false }
  );
};
