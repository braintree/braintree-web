/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./localPayments.css";
import {
  ILocalPaymentInstance,
  ILocalPaymentStartOptions,
  ILocalPaymentTokenizePayload,
} from "../../types";

const meta: Meta = {
  title: "Braintree/Local Payment Methods",
  parameters: {
    layout: "centered",
    braintreeScripts: ["local-payment"],
    docs: {
      description: {
        component: `
Local Payment Methods allow customers to pay with banks, wallets, or other means that operate only
in specific regions of the world. For example, your customer in the Netherlands might want to pay
using iDEAL, which is used by more than 60% of consumers in the Netherlands for online purchases,
whereas customers in Belgium on the same website might want to pay using Bancontact, a popular payment method there.
        `,
      },
    },
  },
};

export default meta;

const createLocalPaymentForm = (
  title: string,
  description: string,
  paymentType: string
): HTMLElement => {
  const container = document.createElement("div");
  const isSwishQr = paymentType === "swishQr";
  const currencyBlock = isSwishQr
    ? `
        <div class="shared-form-group">
          <label class="shared-label">Currency</label>
          <select id="currency" class="shared-select">
            <option value="SEK" selected>SEK</option>
          </select>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">Country Code</label>
          <select id="country-code" class="shared-select">
            <option value="SE" selected>Sweden (SE)</option>
          </select>
        </div>
        <div id="swish-qr-container" class="swish-qr-container" style="min-height:128px;margin:12px 0;"></div>
      `
    : `
        <div class="shared-form-group">
          <label class="shared-label">Currency</label>
          <select id="currency" class="shared-select">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div class="shared-form-group">
          <label class="shared-label">Country Code</label>
          <select id="country-code" class="shared-select">
            <option value="NL">Netherlands (NL)</option>
            <option value="DE">Germany (DE)</option>
            <option value="IT">Italy (IT)</option>
          </select>
        </div>
      `;

  container.innerHTML = `
    <div class="shared-container">
      <h2 class="local-payment-title">${title}</h2>

      <div class="local-payment-form-section">
        <p class="shared-description">
          ${description}
        </p>
      </div>

      ${
        paymentType !== "crypto"
          ? `
      <div class="local-payment-form-section">
        <div class="shared-form-group">
          <label class="shared-label">Amount</label>
          <input type="text" id="amount" value="10.00" class="shared-input" />
        </div>
        ${currencyBlock}
      `
          : ""
      }

      </div>

      <button type="button" id="payment-button" class="shared-button" disabled>Initializing...</button>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Loading local payment methods...</div>
    </div>
  `;

  return container;
};

const initializeLocalPayments = (
  container: HTMLElement,
  paymentType: string,
  useRedirectUrl = false
): void => {
  const authorization = getAuthorizationToken();
  const paymentButton = container.querySelector(
    "#payment-button"
  ) as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const amountInput = container.querySelector("#amount") as HTMLInputElement;
  const currencySelect = container.querySelector(
    "#currency"
  ) as HTMLSelectElement;
  const countrySelect = container.querySelector(
    "#country-code"
  ) as HTMLSelectElement;

  let localPaymentInstance: ILocalPaymentInstance;

  // SDK scripts are already loaded by createSimpleBraintreeStory
  window
    .braintree!.client.create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree!.localPayment.create(
        useRedirectUrl
          ? {
              client: clientInstance,
              redirectUrl: window.location.href,
            }
          : {
              client: clientInstance,
            }
      );
    })
    .then((localPayment) => {
      localPaymentInstance = localPayment;
      // Test-only: Playwright api-coverage tests (see .storybook/tests/local-payment/api-coverage.test.ts)
      window.__btLocalPayment = localPayment;
      loadingDiv.style.display = "none";
      paymentButton.disabled = false;
      paymentButton.textContent =
        paymentType === "swishQr"
          ? "Pay with Swish (QR)"
          : `Pay with ${paymentType}`;
    })
    .catch((error) => {
      loadingDiv.style.display = "none";
      showError(
        resultDiv,
        `Failed to initialize ${paymentType}: ${error.message}`
      );
    });

  const showError = (resultDiv: HTMLElement, message: string) => {
    resultDiv.className =
      "shared-result shared-result--error shared-result--visible";
    resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  };

  const showSuccess = (
    resultDiv: HTMLElement,
    payload: ILocalPaymentTokenizePayload
  ) => {
    resultDiv.className =
      "shared-result shared-result--success shared-result--visible";
    resultDiv.innerHTML = `
      <strong>Payment method obtained!</strong><br>
      <small>Nonce: ${payload.nonce}</small><br>
      <small>Type: ${payload.type}</small>
      ${payload.details && payload.details.email ? `<br><small>Email: ${payload.details.email}</small>` : ""}
    `;
  };

  paymentButton.addEventListener("click", () => {
    if (!localPaymentInstance) return;

    paymentButton.disabled = true;
    paymentButton.textContent = "Processing...";

    const paymentOptions: Record<
      string,
      | string
      | Record<string, string>
      | boolean
      | Record<string, unknown>
      | ((_data: unknown, _start: () => void) => void)
    > = {};

    if (paymentType === "swishQr") {
      paymentOptions.paymentType = "swish";
      paymentOptions.paymentTypeCountryCode = "SE";
      paymentOptions.amount = amountInput.value;
      paymentOptions.currencyCode = currencySelect.value;
      paymentOptions.address = {
        countryCode: countrySelect.value,
      };
      paymentOptions.givenName = "John";
      paymentOptions.surname = "Doe";
      paymentOptions.email = "payer@example.com";
      paymentOptions.phone = "1234567890";
      paymentOptions.fallback = {
        url: "https://your-domain.com/page-to-complete-checkout",
        buttonText: "Complete Payment",
      };
      paymentOptions.swishOptions = {
        requestQrCode: true,
        qrContainer: "#swish-qr-container",
      };
      paymentOptions.onPaymentStart = function () {
        // Swish QR path receives { paymentId } only; no start callback.
      };
    } else if (paymentType !== "crypto") {
      paymentOptions.paymentType = paymentType.toLowerCase();
      paymentOptions.amount = amountInput.value;
      paymentOptions.currencyCode = currencySelect.value;
      paymentOptions.address = {
        countryCode: countrySelect.value,
      };
      paymentOptions.givenName = "John";
      paymentOptions.surname = "Doe";
      paymentOptions.fallback = {
        url: "https://your-domain.com/page-to-complete-checkout",
        buttonText: "Complete Payment",
      };
      paymentOptions.onPaymentStart = function (_data, start) {
        // NOTE: It is critical here to store data.paymentId on your server
        //       so it can be mapped to a webhook sent by Braintree once the
        //       buyer completes their payment. See Start the payment
        //       section for details.

        // Call start to initiate the popup
        start();
      };
    }

    // Add payment type specific options
    if (paymentType === "iDEAL") {
      paymentOptions.paymentType = "ideal";
    } else if (paymentType === "crypto") {
      paymentOptions.paymentType = "crypto";
      paymentOptions.cryptoOptions = {
        approvalUrl: "https://example.com/crypto-approval",
      };
    } else if (paymentType === "Pay Upon Invoice") {
      paymentOptions.paymentType = "payuponinvoice";
      paymentOptions.shippingAddressRequired = true;
      paymentOptions.email = "customer@example.com";
      paymentOptions.givenName = "John";
      paymentOptions.surname = "Doe";
      paymentOptions.phone = "1234567890";
      paymentOptions.streetAddress = "123 Main St";
      paymentOptions.locality = "Berlin";
      paymentOptions.postalCode = "12345";
      paymentOptions.countryCode = "DE";
    }

    if (paymentType !== "crypto") {
      localPaymentInstance
        .startPayment(paymentOptions as ILocalPaymentStartOptions)
        .then(function (payload) {
          if (payload && typeof payload.nonce === "string") {
            console.log("nonce", payload.nonce);
            showSuccess(resultDiv, payload);
          }
          paymentButton.disabled = false;
          paymentButton.textContent =
            paymentType === "swishQr"
              ? "Pay with Swish (QR)"
              : `Pay with ${paymentType}`;
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      localPaymentInstance
        .startPayment(paymentOptions as ILocalPaymentStartOptions)
        .catch((error) => {
          console.error(error);
        });
    }
  });
};

export const iDEAL: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLocalPaymentForm(
        "iDEAL Local Payment",
        "iDEAL is a popular payment method in the Netherlands. Select your bank and complete the payment.",
        "ideal"
      );
      container.appendChild(formContainer);
      initializeLocalPayments(formContainer, "iDEAL");
    },
    ["client.min.js", "local-payment.min.js"]
  ),
  args: {
    // Example args that could be used to customize the payment flow
    debugMode: false,
  },
};

export const payWithCrypto: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLocalPaymentForm(
        "Pay with Crypto Local Payment",
        "Pay with Crypto is a payment solution that allows you to accept cryptocurrency (crypto) payments from global buyers and receive automatic settlement in local currency.",
        "crypto"
      );
      container.appendChild(formContainer);
      initializeLocalPayments(formContainer, "crypto");
    },
    ["client.min.js", "local-payment.min.js"]
  ),
  args: {
    // Example args that could be used to customize the payment flow
    debugMode: false,
  },
};

/**
 * Same as iDEAL, but `localPayment.create` uses `redirectUrl: window.location.href` so
 * a return URL with `?token=…` (or `wasCanceled`) can drive `index.js` tokenize-on-create.
 * Used for integration / Playwright `index.js` coverage; see api-coverage tests.
 */
export const iDEALRedirect: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLocalPaymentForm(
        "iDEAL Local Payment (full-page redirect return)",
        "iDEAL with create({ redirectUrl }) to support completing local payment on return; query string may include token for tokenization on load.",
        "ideal"
      );
      container.appendChild(formContainer);
      initializeLocalPayments(formContainer, "iDEAL", true);
    },
    ["client.min.js", "local-payment.min.js"]
  ),
  args: {
    debugMode: false,
  },
};

/**
 * Desktop Swish with `requestQrCode` so `startPayment` injects a QR image via
 * `inject-qr-code.js` when `local_payments/create` returns `qrDetails.qrImage`.
 * Used for integration tests; requires a mocked create response with valid base64.
 */
export const swishQr: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLocalPaymentForm(
        "Swish QR (desktop)",
        "Swish with requestQrCode on desktop injects the QR image into the container after create.",
        "swishQr"
      );
      container.appendChild(formContainer);
      initializeLocalPayments(formContainer, "swishQr");
    },
    ["client.min.js", "local-payment.min.js"]
  ),
  args: {
    debugMode: false,
  },
};
