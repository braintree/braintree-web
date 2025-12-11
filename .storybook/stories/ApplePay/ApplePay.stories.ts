/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./applePay.css";

const meta: Meta = {
  title: "Braintree/Apple Pay",
  parameters: {
    layout: "centered",
    braintreeScripts: ["apple-pay"],
    docs: {
      description: {
        component: `
Apple Pay allows customers to make secure purchases using a credit or debit card associated with a supported
Apple mobile device. Businesses can accept Apple Pay on newer versions of iOS and Safari, making it quick and
easy for customers to buy on both mobile and the web.

Behind the scenes, Apple uses a tokenization service and encrypts the customer's card number, assigning it
a device-specific identifier called a DPAN. Braintree and the processing banks then use this DPAN in place
of the real card number to securely handle transactions.
        `,
      },
    },
  },
};

export default meta;

// 14 is the latest version as of today (2024-07-17)
const APPLE_PAY_VERSION = 14;

const createIframe = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
  <div class="shared-container">
      <h2>Apple Pay iframe</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Apple Pay integration within an iframe for embedded payment flows.
        </p>
      </div>
      <iframe allow="payment" src="https://127.0.0.1:8080/iframe.html?globals=&args=&id=braintree-apple-pay--apple-pay&viewMode=story" width="600" height="600"></iframe>
  </div>`;

  return container;
};

const createApplePayForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Apple Pay</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Apple Pay allows customers to make secure payments using Touch ID, Face ID, or their device passcode.
        </p>
      </div>

      <div class="apple-pay-requirements">
        <strong>Requirements:</strong>
        <ul>
          <li>Safari browser or iOS device</li>
          <li>Apple Pay enabled in browser/device</li>
          <li>Valid payment method in Apple Wallet</li>
        </ul>
      </div>

      <div class="shared-spacing-bottom">
        <div class="shared-form-group">
          <label class="shared-label" for="amount">Amount</label>
          <input type="text" id="amount" value="19.99" class="shared-input" />
        </div>

        <div class="shared-form-group">
          <label class="shared-label" for="currency">Currency</label>
          <select id="currency" class="shared-select">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div class="shared-form-group">
          <label class="shared-label">
            <input type="checkbox" id="enable-recur-check"> Enable Recurring Payments
          </label>
        </div>

        <div class="shared-form-group" id="recurring-options" style="display: none; margin-left: 20px;">
          <label class="shared-label">
            <input type="radio" name="recurring-type" id="recurring-radio" disabled> Recurring Payment
          </label>
          <label class="shared-label">
            <input type="radio" name="recurring-type" id="deferred-radio" disabled> Deferred Payment
          </label>
          <label class="shared-label">
            <input type="radio" name="recurring-type" id="auto-reload-radio" disabled> Auto-reload Payment
          </label>
        </div>
      </div>

      <div id="apple-pay-button" class="apple-pay-button-container"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Checking Apple Pay availability...</div>
    </div>
  `;

  return container;
};

const initializeApplePay = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const applePayButtonDiv = container.querySelector(
    "#apple-pay-button"
  ) as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const amountInput = container.querySelector("#amount") as HTMLInputElement;
  const currencySelect = container.querySelector(
    "#currency"
  ) as HTMLSelectElement;
  const recurEnableCheck = container.querySelector(
    "#enable-recur-check"
  ) as HTMLInputElement;
  const recurringOptions = container.querySelector(
    "#recurring-options"
  ) as HTMLElement;
  const recurPaymentFlag = container.querySelector(
    "#recurring-radio"
  ) as HTMLInputElement;
  const deferPaymentFlag = container.querySelector(
    "#deferred-radio"
  ) as HTMLInputElement;
  const autoreloadPaymentFlag = container.querySelector(
    "#auto-reload-radio"
  ) as HTMLInputElement;

  let applePayInstance;

  // Setup recurring payment controls
  recurEnableCheck.addEventListener("change", () => {
    console.log("recur-enable checkout: %s", recurEnableCheck.checked);

    if (recurEnableCheck.checked) {
      recurringOptions.style.display = "block";
      recurPaymentFlag.disabled = false;
      deferPaymentFlag.disabled = false;
      autoreloadPaymentFlag.disabled = false;
    } else {
      recurringOptions.style.display = "none";
      recurPaymentFlag.disabled = true;
      deferPaymentFlag.disabled = true;
      autoreloadPaymentFlag.disabled = true;
      // Clear any selections
      recurPaymentFlag.checked = false;
      deferPaymentFlag.checked = false;
      autoreloadPaymentFlag.checked = false;
    }
  });

  const showError = (message: string) => {
    loadingDiv.style.display = "none";
    resultDiv.style.display = "block";
    resultDiv.className = "shared-result shared-result--error";
    resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  };

  const showSuccess = (payload) => {
    resultDiv.style.display = "block";
    resultDiv.className =
      "shared-result shared-result--success shared-result--visible";
    const details = payload.details;
    resultDiv.innerHTML = `
      <strong>Apple Pay payment authorized!</strong><br>
      <small>Nonce: ${payload.nonce}</small><br>
      <small>Type: ${payload.type}</small><br>
      <small>Is Recurring: ${recurEnableCheck.checked}</small><br>
      <small>Is Device Token: ${details?.isDeviceToken || false}</small><br>
      <small>Details: ${payload.details ? JSON.stringify(payload.details, null, 2) : "N/A"}</small>
    `;
  };

  console.log("ApplePaySession", window.ApplePaySession);

  // Check if Apple Pay is available
  if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
    showError(
      "Apple Pay is not available on this device/browser. Please use Safari on a compatible device with Apple Pay enabled."
    );
    return;
  }

  console.log("ApplePay supported.");

  // SDK scripts are already loaded by createBraintreeStory helper
  setupApplePay();

  function setupApplePay() {
    window.braintree.client
      .create({
        authorization: authorization,
      })
      .then((clientInstance) => {
        return window.braintree.applePay.create({
          client: clientInstance,
        });
      })
      .then((applePay) => {
        applePayInstance = applePay;
        console.log("Apple Pay instance created successfully");
        createApplePayButton();
      })
      .catch((error) => {
        console.error("Top level error:", error);
        showError("Failed to initialize Apple Pay: " + error.message);
      });
  }

  const createApplePayButton = () => {
    loadingDiv.style.display = "none";

    // Create Apple Pay button
    const button = document.createElement("button");
    button.className = "apple-pay-button";
    button.innerHTML = "🍎 Apple Pay";

    button.addEventListener("click", () => {
      if (!applePayInstance) return;

      button.disabled = true;
      button.textContent = "Processing...";

      const paymentRequest = applePayInstance.createPaymentRequest({
        total: {
          label: "My Store",
          amount: amountInput.value,
        },
        currencyCode: currencySelect.value,
        countryCode: "US",
        supportedNetworks: ["visa", "masterCard", "amex", "discover"],
        merchantCapabilities: [
          "supports3DS",
          "supportsEMV",
          "supportsCredit",
          "supportsDebit",
        ],
        // We recommend collecting billing address information, at minimum
        // billing postal code, and passing that billing postal code with
        // all Apple Pay transactions as a best practice.
        requiredBillingContactFields: ["postalAddress"],
      });

      // Add recurring payment requests based on selection
      if (recurEnableCheck.checked && autoreloadPaymentFlag.checked) {
        const recurPaymentRequest = {
          paymentDescription: "payment description",
          managementURL: "https://www.merchant.com/update-payment",
          automaticReloadBilling: {
            label: "The paymentLabel",
            amount: "20.99",
            type: "final",
            paymentTiming: "automaticReload",
            automaticReloadPaymentThresholdAmount: "1.00",
          },
        };
        paymentRequest.automaticReloadPaymentRequest = recurPaymentRequest;
      } else if (recurEnableCheck.checked && deferPaymentFlag.checked) {
        const recurPaymentRequest = {
          paymentDescription: "payment description",
          managementURL: "https://www.merchant.com/update-payment",
          deferredBilling: {
            label: "The paymentLabel",
            amount: "20.99",
            type: "final",
            paymentTiming: "deferred",
            deferredPaymentDate: new Date("2025-12-12"),
          },
        };
        paymentRequest.deferredPaymentRequest = recurPaymentRequest;
      } else if (recurEnableCheck.checked && recurPaymentFlag.checked) {
        const recurPaymentRequest = {
          paymentDescription: "payment description",
          managementURL: "https://www.merchant.com/update-payment",
          regularBilling: {
            label: "The paymentLabel",
            amount: "20.99",
            type: "final",
            paymentTiming: "recurring",
            recurringPaymentStartDate: new Date("2025-02-13T10:15:00"),
            recurringPaymentIntervalUnit: "month",
            recurringPaymentIntervalCount: 12,
          },
        };
        paymentRequest.recurringPaymentRequest = recurPaymentRequest;
      }

      console.log("Payment Request: ", paymentRequest);

      const session = new window.ApplePaySession(
        APPLE_PAY_VERSION,
        paymentRequest
      );

      session.onvalidatemerchant = (event) => {
        applePayInstance
          .performValidation({
            validationURL: event.validationURL,
            displayName: "My Store",
          })
          .then((merchantSession) => {
            session.completeMerchantValidation(merchantSession);
            console.log("Merchant is validated!");
          })
          .catch((validationErr) => {
            // You should show an error to the user, e.g. 'Apple Pay failed to load.'
            console.error("Error validating merchant:", validationErr);
            session.abort();
            button.disabled = false;
            button.innerHTML = "🍎 Apple Pay";
            showError("Apple Pay validation failed: " + validationErr.message);
          });
      };

      session.onpaymentauthorized = (event) => {
        applePayInstance
          .tokenize({
            token: event.payment.token,
          })
          .then((payload) => {
            const localDetails = payload.details;

            // Send payload.nonce to your server.
            console.log("nonce:", payload.nonce);
            console.log(
              "isRecurringPayment: %s; isDeviceToken: %s",
              recurEnableCheck.checked,
              localDetails?.isDeviceToken
            );

            // After you have transacted with the payload.nonce,
            // call 'completePayment' to dismiss the Apple Pay sheet.
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            button.disabled = false;
            button.innerHTML = "🍎 Apple Pay";
            showSuccess(payload);
          })
          .catch((tokenizeErr) => {
            console.error("Error tokenizing Apple Pay:", tokenizeErr);
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            button.disabled = false;
            button.innerHTML = "🍎 Apple Pay";
            showError("Apple Pay tokenization failed: " + tokenizeErr.message);
          });
      };

      session.oncancel = () => {
        button.disabled = false;
        button.innerHTML = "🍎 Apple Pay";
        console.log("Apple Pay canceled by user");
      };

      session.begin();
    });

    applePayButtonDiv.appendChild(button);
  };
};

export const ApplePay: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createApplePayForm();
      container.appendChild(formContainer);
      initializeApplePay(formContainer);
    },
    ["client.min.js", "apple-pay.min.js"]
  ),
};

export const ApplePayInIframe: StoryObj = {
  render: (): HTMLElement => {
    const container = document.createElement("div");
    const formContainer = createIframe();
    container.appendChild(formContainer);
    return container;
  },
};
