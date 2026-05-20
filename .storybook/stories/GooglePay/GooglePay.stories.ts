/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import type { IGooglePaymentTokenizePayload } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import type { IGooglePaymentsClient } from "../../types/global";
import "./googlePay.css";

const GOOGLE_PAY_SCRIPT_URL = "https://pay.google.com/gp/p/js/pay.js";

const meta: Meta = {
  title: "Braintree/Google Pay",
  parameters: {
    layout: "centered",
    braintreeScripts: ["google-payment"],
    docs: {
      description: {
        component: `
Google Pay allows customers to pay with cards saved to their Google account. The Braintree SDK
handles tokenization through Google's Pay API (v2), supporting both \`PAN_ONLY\` (raw card numbers)
and \`CRYPTOGRAM_3DS\` (device/network tokens) authentication methods automatically.

The SDK always advertises both auth methods — Google Pay decides which to use based on the card
and device context. The response payload includes \`details.isNetworkTokenized\` to indicate which
method was used.
        `,
      },
    },
  },
};

export default meta;

function loadGooglePayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.payments?.api) {
      resolve();

      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_PAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Pay script"));
    document.head.appendChild(script);
  });
}

const createGooglePayForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Google Pay</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Google Pay lets customers pay with cards saved to their Google account.
          The Braintree SDK generates a v2 payment request with both PAN_ONLY and
          CRYPTOGRAM_3DS auth methods enabled by default.
        </p>
      </div>

      <div class="google-pay-requirements">
        <strong>Requirements:</strong>
        <ul>
          <li>Chrome browser (or any browser supporting Google Pay)</li>
          <li>Google account with a saved payment method</li>
          <li>HTTPS (except localhost for testing)</li>
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
            <option value="CAD">CAD</option>
          </select>
        </div>

        <div class="shared-form-group">
          <label class="shared-label">
            <input type="checkbox" id="request-billing-address"> Request Billing Address
          </label>
        </div>

        <div class="shared-form-group">
          <label class="shared-label">
            <input type="checkbox" id="request-email"> Request Email
          </label>
        </div>

        <div class="shared-form-group">
          <label class="shared-label">
            <input type="checkbox" id="request-shipping"> Request Shipping Address
          </label>
        </div>
      </div>

      <div id="google-pay-button" class="google-pay-button-container"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Loading Google Pay...</div>
    </div>
  `;

  return container;
};

const initializeGooglePay = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const buttonContainer = container.querySelector(
    "#google-pay-button"
  ) as HTMLElement;
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const amountInput = container.querySelector("#amount") as HTMLInputElement;
  const currencySelect = container.querySelector(
    "#currency"
  ) as HTMLSelectElement;
  const billingAddressCheckbox = container.querySelector(
    "#request-billing-address"
  ) as HTMLInputElement;
  const emailCheckbox = container.querySelector(
    "#request-email"
  ) as HTMLInputElement;
  const shippingCheckbox = container.querySelector(
    "#request-shipping"
  ) as HTMLInputElement;

  let googlePaymentInstance: import("../../types/global").IGooglePaymentInstance;
  let paymentsClient: IGooglePaymentsClient;

  const showError = (message: string) => {
    loadingDiv.style.display = "none";
    resultDiv.style.display = "block";
    resultDiv.className =
      "shared-result shared-result--error shared-result--visible";
    resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  };

  const showSuccess = (payload: IGooglePaymentTokenizePayload) => {
    resultDiv.style.display = "block";
    resultDiv.className =
      "shared-result shared-result--success shared-result--visible";

    let html = `
      <strong>Google Pay payment authorized!</strong><br>
      <small>Nonce: ${payload.nonce}</small><br>
      <small>Type: ${payload.type}</small><br>
    `;

    if (payload.details) {
      html += `
        <small>Card Type: ${payload.details.cardType}</small><br>
        <small>Last Four: ${payload.details.lastFour}</small><br>
        <small>Network Tokenized: ${payload.details.isNetworkTokenized}</small><br>
        <small>BIN: ${payload.details.bin}</small><br>
      `;
    }

    if (payload.description) {
      html += `<small>Description: ${payload.description}</small><br>`;
    }

    html += `<small>Full Payload: <pre style="white-space: pre-wrap; font-size: 11px;">${JSON.stringify(payload, null, 2)}</pre></small>`;

    resultDiv.innerHTML = html;
  };

  loadGooglePayScript()
    .then(() => {
      return setupGooglePay();
    })
    .catch((error) => {
      console.error("Google Pay initialization error:", error);
      showError("Failed to initialize Google Pay: " + error.message);
    });

  function setupGooglePay() {
    paymentsClient = new window.google!.payments.api.PaymentsClient({
      environment: "TEST",
    });

    return window
      .braintree!.client.create({ authorization })
      .then((clientInstance) => {
        return window.braintree!.googlePayment.create({
          client: clientInstance,
        });
      })
      .then((instance) => {
        googlePaymentInstance = instance;
        console.log("Google Payment instance created");

        const paymentDataRequest =
          googlePaymentInstance.createPaymentDataRequest();

        return paymentsClient.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: (
            paymentDataRequest as { allowedPaymentMethods: unknown[] }
          ).allowedPaymentMethods,
        });
      })
      .then((response) => {
        if (response.result) {
          console.log("Google Pay is ready");
          createGooglePayButton();
        } else {
          showError(
            "Google Pay is not available. Make sure you have a Google account with a saved payment method."
          );
        }
      })
      .catch((error) => {
        console.error("Google Pay setup error:", error);
        showError("Failed to set up Google Pay: " + error.message);
      });
  }

  function createGooglePayButton() {
    loadingDiv.style.display = "none";

    const nativeButton = paymentsClient.createButton({
      onClick: handleGooglePayClick,
      buttonColor: "black",
      buttonType: "pay",
      buttonSizeMode: "fill",
    });
    nativeButton.style.width = "100%";
    buttonContainer.appendChild(nativeButton);

    const fallbackButton = document.createElement("button");
    fallbackButton.className = "google-pay-button";
    fallbackButton.textContent = "Google Pay (fallback button)";
    fallbackButton.style.marginTop = "10px";
    fallbackButton.addEventListener("click", handleGooglePayClick);
    buttonContainer.appendChild(fallbackButton);
  }

  function handleGooglePayClick() {
    resultDiv.style.display = "none";

    const paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
      transactionInfo: {
        currencyCode: currencySelect.value,
        totalPriceStatus: "FINAL",
        totalPrice: amountInput.value,
      },
    }) as Record<string, unknown>;

    if (billingAddressCheckbox.checked) {
      const methods = paymentDataRequest.allowedPaymentMethods as Array<
        Record<string, Record<string, unknown>>
      >;
      if (methods && methods[0]) {
        methods[0].parameters = {
          ...methods[0].parameters,
          billingAddressRequired: true,
          billingAddressParameters: {
            format: "FULL",
            phoneNumberRequired: true,
          },
        };
      }
    }

    if (emailCheckbox.checked) {
      paymentDataRequest.emailRequired = true;
    }

    if (shippingCheckbox.checked) {
      paymentDataRequest.shippingAddressRequired = true;
      paymentDataRequest.shippingAddressParameters = {
        phoneNumberRequired: true,
      };
    }

    console.log("Payment Data Request:", paymentDataRequest);

    paymentsClient
      .loadPaymentData(paymentDataRequest)
      .then((paymentData) => {
        console.log("Google Pay payment data:", paymentData);

        return googlePaymentInstance.parseResponse(paymentData);
      })
      .then((parsedResponse) => {
        console.log("Parsed response:", parsedResponse);
        showSuccess(parsedResponse);
      })
      .catch((error) => {
        if (error.statusCode === "CANCELED") {
          console.log("Google Pay canceled by user");
          resultDiv.style.display = "block";
          resultDiv.className =
            "shared-result shared-result--error shared-result--visible";
          resultDiv.innerHTML =
            "<strong>Canceled:</strong> Payment was canceled by the user.";
        } else {
          console.error("Google Pay error:", error);
          showError(
            error.statusMessage || error.message || "Google Pay payment failed"
          );
        }
      });
  }
};

export const GooglePay: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createGooglePayForm();
      container.appendChild(formContainer);
      initializeGooglePay(formContainer);
    },
    ["client.min.js", "google-payment.min.js"]
  ),
};

export const GooglePayInIframe: StoryObj = {
  render: (): HTMLElement => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="shared-container">
        <h2>Google Pay in iframe</h2>

        <div class="shared-spacing-bottom">
          <p class="shared-description">
            Google Pay running inside an iframe with <code>allow="payment"</code>.
            This simulates embedded checkout flows where the payment form is hosted
            in a cross-origin or same-origin iframe on a merchant page.
          </p>
        </div>

        <div class="google-pay-requirements">
          <strong>Notes:</strong>
          <ul>
            <li>The <code>allow="payment"</code> attribute is required for the Payment Request API inside iframes</li>
            <li>Google Pay's <code>PaymentsClient</code> works in iframes, unlike Apple Pay's <code>ApplePaySession</code></li>
            <li>The iframe loads the same Google Pay story in isolation</li>
          </ul>
        </div>

        <iframe
          allow="payment"
          src="https://127.0.0.1:8080/iframe.html?globals=&args=&id=braintree-google-pay--google-pay&viewMode=story"
          width="600"
          height="700"
          style="border: 1px solid var(--color-deep-blue); border-radius: 4px;"
        ></iframe>
      </div>
    `;

    return container;
  },
};
