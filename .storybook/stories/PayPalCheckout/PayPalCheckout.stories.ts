import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout",
  parameters: {
    layout: "centered",
    braintreeScripts: ["paypal-checkout"],
    docs: {
      description: {
        component: `
PayPal integration provides multiple payment flow options to suit different business models:

**Payment Flow Types:**
- **One-Time Payments**: Best for infrequent payments with higher AOV (retail, e-commerce)
- **Vaulted Payments**: Ideal for high-frequency, low-AOV purchases (food delivery, marketplaces)
- **Recurring Payments**: Perfect for subscriptions and automated billing (SaaS, streaming, utilities)
        `,
      },
    },
  },
};

export default meta;

const createPayPalForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Braintree PayPal Checkout</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Click the PayPal button below to pay with PayPal or a credit/debit card.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupPayPalCheckout = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;

  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree.paypalCheckout.create({
        client: clientInstance,
      });
    })
    .then((paypalCheckoutInstance) => {
      return window.paypal
        .Buttons({
          fundingSource: window.paypal.FUNDING.PAYPAL,

          createOrder() {
            return paypalCheckoutInstance.createPayment({
              flow: "checkout",
              amount: "10.00",
              currency: "USD",
              intent: "capture",
            });
          },

          onApprove(data) {
            return paypalCheckoutInstance
              .tokenizePayment(data)
              .then((payload) => {
                resultDiv.className =
                  "shared-result shared-result--visible shared-result--success";
                resultDiv.innerHTML = `
            <strong>PayPal payment authorized!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Payer Email: ${payload.details.email}</small><br>
            <small>Amount: $10.00</small>
          `;
              });
          },

          onError(err) {
            resultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            resultDiv.innerHTML = `
          <strong>PayPal Error:</strong> ${err.message || "An error occurred"}
        `;
          },
        })
        .render("#paypal-button");
    })
    .catch((error) => {
      resultDiv.className =
        "shared-result shared-result--visible shared-result--error";
      resultDiv.innerHTML = `
      <strong>Initialization Error:</strong> ${error.message}
    `;
    });
};

const setupPayPalVault = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;

  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree.paypalCheckout.create({
        client: clientInstance,
      });
    })
    .then((paypalCheckoutInstance) => {
      return window.paypal
        .Buttons({
          fundingSource: window.paypal.FUNDING.PAYPAL,

          createBillingAgreement() {
            return paypalCheckoutInstance.createPayment({
              flow: "vault",
            });
          },

          onApprove(data) {
            return paypalCheckoutInstance
              .tokenizePayment(data)
              .then((payload) => {
                resultDiv.className =
                  "shared-result shared-result--visible shared-result--success";
                resultDiv.innerHTML = `
            <strong>PayPal account vaulted!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Payer Email: ${payload.details.email}</small><br>
            <small>This payment method can be reused for future transactions</small>
          `;
              });
          },

          onError(err) {
            resultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            resultDiv.innerHTML = `
          <strong>PayPal Error:</strong> ${err.message || "An error occurred"}
        `;
          },
        })
        .render("#paypal-button");
    })
    .catch((error) => {
      resultDiv.className =
        "shared-result shared-result--visible shared-result--error";
      resultDiv.innerHTML = `
      <strong>Initialization Error:</strong> ${error.message}
    `;
    });
};

const setupRecurringBilling = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const purchaseToggle = container.querySelector(
    "#vaultWithPurchaseToggle"
  ) as HTMLInputElement;

  const PAYMENT_PARAMS_WITHOUT_PURCHASE = {
    flow: "vault",
  };

  const PAYMENT_PARAMS_WITH_PURCHASE = {
    ...PAYMENT_PARAMS_WITHOUT_PURCHASE,
    planType: "SUBSCRIPTION",
    planMetadata: {
      billingCycles: [
        {
          billingFrequency: "1",
          billingFrequencyUnit: "MONTH",
          numberOfExecutions: "3",
          sequence: "1",
          startDate: new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0], // Tomorrow
          trial: false,
          pricingScheme: {
            pricingModel: "FIXED",
            price: 200,
          },
        },
      ],
      currencyIsoCode: "USD",
      name: "Premium Subscription",
      productDescription: "Premium Service Plan",
      productQuantity: "1.0",
      oneTimeFeeAmount: "10",
      shippingAmount: "3.0",
      productPrice: "200",
      taxAmount: "20",
      totalAmount: 233.0,
    },
  };

  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree.paypalCheckout.create({
        client: clientInstance,
      });
    })
    .then((paypalCheckoutInstance) => {
      paypalCheckoutInstance.loadPayPalSDK(
        {
          intent: "tokenize",
          vault: true,
        },
        () => {
          window.paypal
            .Buttons({
              fundingSource: window.paypal.FUNDING.PAYPAL,

              createBillingAgreement() {
                const params = purchaseToggle.checked
                  ? PAYMENT_PARAMS_WITH_PURCHASE
                  : PAYMENT_PARAMS_WITHOUT_PURCHASE;

                return paypalCheckoutInstance.createPayment(params);
              },

              onApprove(data) {
                return paypalCheckoutInstance
                  .tokenizePayment(data)
                  .then((payload) => {
                    const mode = purchaseToggle.checked
                      ? "with purchase metadata"
                      : "simple vault";
                    resultDiv.className =
                      "shared-result shared-result--visible shared-result--success";
                    resultDiv.innerHTML = `
              <strong>Recurring billing agreement created ${mode}!</strong><br>
              <small>Nonce: ${payload.nonce}</small><br>
              <small>Payer Email: ${payload.details.email}</small><br>
              <small>Mode: ${purchaseToggle.checked ? "Subscription with metadata" : "Simple vault"}</small>
            `;
                  });
              },

              onError(err) {
                resultDiv.className =
                  "shared-result shared-result--visible shared-result--error";
                resultDiv.innerHTML = `
            <strong>PayPal Error:</strong> ${err.message || "An error occurred"}
          `;
              },
            })
            .render("#paypal-button");
        }
      );
    })
    .catch((error) => {
      resultDiv.className =
        "shared-result shared-result--visible shared-result--error";
      resultDiv.innerHTML = `
      <strong>Initialization Error:</strong> ${error.message}
    `;
    });
};

export const OneTimePayment: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createPayPalForm();
      container.appendChild(formContainer);

      // Load PayPal SDK and initialize PayPal checkout
      const paypalSDKScript = document.createElement("script");
      paypalSDKScript.src =
        "https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&currency=USD";
      paypalSDKScript.onload = () => {
        setupPayPalCheckout(formContainer);
      };
      document.head.appendChild(paypalSDKScript);
    },
    ["client.min.js", "paypal-checkout.min.js"]
  ),
};

export const VaultFlow: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createPayPalForm();
      (formContainer.querySelector("h2") as HTMLHeadingElement).textContent =
        "Braintree PayPal Vault";
      (formContainer.querySelector("p") as HTMLParagraphElement).textContent =
        "This flow saves the PayPal account for future payments.";
      container.appendChild(formContainer);

      // Load PayPal SDK and initialize PayPal vault
      const paypalSDKScript = document.createElement("script");
      paypalSDKScript.src =
        "https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&currency=USD&vault=true";
      paypalSDKScript.onload = () => {
        setupPayPalVault(formContainer);
      };
      document.head.appendChild(paypalSDKScript);
    },
    ["client.min.js", "paypal-checkout.min.js"]
  ),
};

export const RecurringBillingAgreement: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = document.createElement("div");
      formContainer.innerHTML = `
        <div class="shared-container paypal-container">
          <h2>PayPal Recurring Billing Agreement</h2>

          <div class="paypal-description">
            <p class="shared-description">
              Create a recurring billing agreement with advanced subscription metadata.
            </p>

            <div class="paypal-form-group">
              <label class="paypal-checkbox-label">
                <input type="checkbox" id="vaultWithPurchaseToggle" class="paypal-checkbox" />
                <span class="paypal-checkbox-text">Include purchase transaction metadata</span>
              </label>
            </div>
          </div>

          <div id="paypal-button" class="paypal-button-container"></div>

          <div id="result" class="shared-result"></div>
        </div>
      `;

      container.appendChild(formContainer);

      // Load PayPal SDK and initialize recurring billing
      const paypalSDKScript = document.createElement("script");
      paypalSDKScript.src =
        "https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&currency=USD&vault=true&intent=tokenize";
      paypalSDKScript.onload = () => {
        setupRecurringBilling(formContainer);
      };
      document.head.appendChild(paypalSDKScript);
    },
    ["client.min.js", "paypal-checkout.min.js"]
  ),
};
