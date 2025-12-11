/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./localPayments.css";

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
  description: string
): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2 class="local-payment-title">${title}</h2>

      <div class="local-payment-form-section">
        <p class="shared-description">
          ${description}
        </p>
      </div>

      <div class="local-payment-form-section">
        <div class="shared-form-group">
          <label class="shared-label">Amount</label>
          <input type="text" id="amount" value="10.00" class="shared-input" />
        </div>

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
  paymentType: string
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

  let localPaymentInstance;

  // SDK scripts are already loaded by createSimpleBraintreeStory
  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree.localPayment.create({
        client: clientInstance,
      });
    })
    .then((localPayment) => {
      localPaymentInstance = localPayment;
      loadingDiv.style.display = "none";
      paymentButton.disabled = false;
      paymentButton.textContent = `Pay with ${paymentType}`;
    })
    .catch((error) => {
      loadingDiv.style.display = "none";
      showError(
        resultDiv,
        `Failed to initialize ${paymentType}: ${error.message}`
      );
    });

  const showError = (resultDiv, message) => {
    resultDiv.className =
      "shared-result shared-result--error shared-result--visible";
    resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  };

  const showSuccess = (resultDiv, payload) => {
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
      | ((_data: unknown, _start: () => void) => void)
    > = {
      paymentType: paymentType.toLowerCase(),
      amount: amountInput.value,
      currencyCode: currencySelect.value,
      address: {
        countryCode: countrySelect.value,
      },
      givenName: "John",
      surname: "Doe",
      fallback: {
        url: "https://your-domain.com/page-to-complete-checkout",
        buttonText: "Complete Payment",
      },
      onPaymentStart: function (_data, start) {
        // NOTE: It is critical here to store data.paymentId on your server
        //       so it can be mapped to a webhook sent by Braintree once the
        //       buyer completes their payment. See Start the payment
        //       section for details.

        // Call start to initiate the popup
        start();
      },
    };

    // Add payment type specific options
    if (paymentType === "iDEAL") {
      paymentOptions.paymentType = "ideal";
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

    localPaymentInstance
      .startPayment(paymentOptions)
      .then(function (payload) {
        // Submit payload.nonce to your server
        console.log("nonce", payload.nonce);
        paymentButton.disabled = false;
        paymentButton.textContent = `Pay with ${paymentType}`;
        showSuccess(resultDiv, payload);
      })
      .catch((error) => {
        console.error(error);
      });
  });
};

export const iDEAL: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLocalPaymentForm(
        "iDEAL Local Payment",
        "iDEAL is a popular payment method in the Netherlands. Select your bank and complete the payment."
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
