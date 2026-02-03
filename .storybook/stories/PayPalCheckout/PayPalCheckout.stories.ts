import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
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
  const braintree = getBraintreeSDK(resultDiv);

  braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return braintree.paypalCheckout.create({
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
  const braintree = getBraintreeSDK(resultDiv);

  braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return braintree.paypalCheckout.create({
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
  const braintree = getBraintreeSDK(resultDiv);

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

  braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return braintree.paypalCheckout.create({
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

// Types for Vault-Initiated Checkout
type CreateClientTokenResponse = {
  data: {
    createClientToken: {
      clientToken: string;
    };
  };
};

interface TokenizePayload {
  nonce: string;
  type: string;
  details: {
    email?: string;
    payerId?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface IPayPalCheckout {
  createPayment: (_options: {
    flow: string;
    amount?: string;
    currency?: string;
    intent?: string;
    planType?: string;
    planMetadata?: object;
  }) => Promise<string>;
  tokenizePayment: (_data: object) => Promise<TokenizePayload>;
  loadPayPalSDK: (
    _options: { intent?: string; vault?: boolean },
    _callback: () => void
  ) => void;
  startVaultInitiatedCheckout: (_options: {
    vaultInitiatedCheckoutPaymentMethodToken: string;
    amount: string;
    currency: string;
    optOutOfModalBackdrop?: boolean;
  }) => Promise<TokenizePayload>;
}

const createVaultInitiatedCheckoutForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container" style="max-width: 700px;">
      <h2 style="margin-bottom: 10px; font-size: 24px;">PayPal Vault-Initiated Checkout</h2>

      <div class="paypal-description" style="margin-bottom: 20px; padding: 15px; background-color: #f5f7fa; border-left: 4px solid var(--color-deep-blue); border-radius: 4px;">
        <p class="shared-description" style="margin: 0;">
          Complete end-to-end flow: First vault a PayPal account (creates a Billing Agreement),
          then use it for vault-initiated checkout.
        </p>
      </div>

      <!-- Credentials Section -->
      <div style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 1: Merchant Credentials</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label class="shared-label">Public Key</label>
            <input type="text" id="public-key" class="shared-input" placeholder="Enter your public key" />
            <div id="help-public-key" style="color: red; font-size: 12px; margin-top: 4px;"></div>
          </div>
          <div>
            <label class="shared-label">Private Key</label>
            <input type="password" id="private-key" class="shared-input" placeholder="Enter your private key" />
            <div id="help-private-key" style="color: red; font-size: 12px; margin-top: 4px;"></div>
          </div>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">Customer ID</label>
          <input type="text" id="customer-id" class="shared-input" value="vault_test_customer" placeholder="Enter customer ID" />
        </div>
        <button type="button" id="initialize-btn" class="shared-button">Initialize</button>
      </div>

      <!-- Vault Section -->
      <div id="vault-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 2: Vault a PayPal Account</h3>
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
          Click the PayPal button to create a Billing Agreement. This vaults the PayPal account for future use.
        </p>
        <div id="paypal-vault-button" style="margin-bottom: 15px;"></div>
        <div id="vault-result" style="padding: 10px; border-radius: 4px; display: none;"></div>
      </div>

      <!-- Checkout Section -->
      <div id="checkout-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 3: Vault-Initiated Checkout</h3>
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
          Now use the vaulted PayPal account to start a vault-initiated checkout.
        </p>
        <div id="vaulted-account-info" style="padding: 15px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label class="shared-label">Amount</label>
            <input type="text" id="amount" class="shared-input" value="10.00" />
          </div>
          <div>
            <label class="shared-label">Currency</label>
            <input type="text" id="currency" class="shared-input" value="USD" />
          </div>
        </div>
        <div class="paypal-form-group" style="margin-bottom: 15px;">
          <label class="paypal-checkbox-label">
            <input type="checkbox" id="opt-out-backdrop" class="paypal-checkbox" />
            <span class="paypal-checkbox-text">Opt out of modal backdrop</span>
          </label>
        </div>
        <button type="button" id="checkout-btn" class="shared-button">Start Vault-Initiated Checkout</button>
      </div>

      <!-- Result Display -->
      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupVaultInitiatedCheckout = (
  container: HTMLElement,
  paypalSDK: typeof window.paypal
): void => {
  let paypalCheckoutInstance: IPayPalCheckout;
  let vaultedNonce: string | null = null;
  let vaultedEmail: string | null = null;

  // Helper function to get element by ID
  const getElementById = <T extends HTMLElement = HTMLElement>(
    id: string
  ): T => {
    return container.querySelector(`#${id}`) as T;
  };

  // Helper function to show result
  const showResult = (message: string, isSuccess: boolean): void => {
    const resultDiv = getElementById("result");
    resultDiv.className = `shared-result shared-result--visible ${isSuccess ? "shared-result--success" : "shared-result--error"}`;
    resultDiv.innerHTML = message;
  };

  // Helper function to show vault result
  const showVaultResult = (message: string, isSuccess: boolean): void => {
    const vaultResultDiv = getElementById("vault-result");
    vaultResultDiv.style.display = "block";
    vaultResultDiv.style.backgroundColor = isSuccess ? "#d4edda" : "#f8d7da";
    vaultResultDiv.style.color = isSuccess ? "#155724" : "#721c24";
    vaultResultDiv.innerHTML = message;
  };

  // Validate credentials
  const validateCredentials = (): boolean => {
    let isValid = true;
    const publicKey =
      getElementById<HTMLInputElement>("public-key").value.trim();
    const privateKey =
      getElementById<HTMLInputElement>("private-key").value.trim();

    const publicKeyHelp = getElementById("help-public-key");
    const privateKeyHelp = getElementById("help-private-key");

    if (!publicKey) {
      isValid = false;
      publicKeyHelp.textContent = "Public key is required.";
    } else {
      publicKeyHelp.textContent = "";
    }

    if (!privateKey) {
      isValid = false;
      privateKeyHelp.textContent = "Private key is required.";
    } else {
      privateKeyHelp.textContent = "";
    }

    return isValid;
  };

  // Get client token via GraphQL
  const getClientToken = async (): Promise<string> => {
    const pubKey = getElementById<HTMLInputElement>("public-key").value;
    const privKey = getElementById<HTMLInputElement>("private-key").value;
    const customerId = getElementById<HTMLInputElement>("customer-id").value;

    const gqlAuthorization = window.btoa(`${pubKey}:${privKey}`);
    const responseBody = `{"query": "mutation CreateClientToken($input: CreateClientTokenInput!) { createClientToken(input: $input) { clientToken } }","variables": {"input": {"clientToken": {"customerId": "${customerId}"}}}}`;

    const response = await fetch(
      "https://payments.sandbox.braintree-api.com/graphql",
      {
        method: "POST",
        headers: {
          Authorization: gqlAuthorization,
          "Braintree-version": "2023-07-03",
          "Content-Type": "application/json",
        },
        body: responseBody,
      }
    );

    const clientTokenResponse: CreateClientTokenResponse =
      await response.json();
    return clientTokenResponse.data.createClientToken.clientToken;
  };

  // Initialize button handler
  getElementById("initialize-btn").addEventListener("click", async () => {
    if (!validateCredentials()) {
      return;
    }

    const initBtn = getElementById<HTMLButtonElement>("initialize-btn");
    initBtn.disabled = true;
    initBtn.textContent = "Initializing...";

    try {
      const clientToken = await getClientToken();

      const braintree = getBraintreeSDK();

      const clientInstance = await braintree.client.create({
        authorization: clientToken,
      });

      paypalCheckoutInstance = await braintree.paypalCheckout.create({
        client: clientInstance,
      });

      showResult(
        "<strong>Initialized successfully!</strong> Now vault a PayPal account in Step 2.",
        true
      );

      // Show vault section
      getElementById("vault-section").style.display = "block";

      // Render PayPal vault button
      paypalSDK
        .Buttons({
          fundingSource: paypalSDK.FUNDING.PAYPAL,

          createBillingAgreement() {
            return paypalCheckoutInstance.createPayment({
              flow: "vault",
            });
          },

          onApprove(data: object) {
            return paypalCheckoutInstance
              .tokenizePayment(data)
              .then((payload) => {
                vaultedNonce = payload.nonce;
                vaultedEmail = payload.details?.email || "Unknown";

                showVaultResult(
                  `<strong>PayPal account vaulted!</strong><br>
                  <small>Email: ${vaultedEmail}</small><br>
                  <small>Nonce: ${payload.nonce.substring(0, 20)}...</small>`,
                  true
                );

                // Show checkout section with vaulted account info
                getElementById("checkout-section").style.display = "block";
                getElementById("vaulted-account-info").innerHTML = `
                  <strong>Vaulted PayPal Account:</strong><br>
                  <small>Email: ${vaultedEmail}</small><br>
                  <small>Payer ID: ${payload.details?.payerId || "N/A"}</small>
                `;

                showResult(
                  "<strong>Step 2 complete!</strong> You can now start vault-initiated checkout in Step 3.",
                  true
                );
              });
          },

          onError(err: Error) {
            showVaultResult(
              `<strong>Vault Error:</strong> ${err.message || "An error occurred"}`,
              false
            );
          },

          onCancel() {
            showVaultResult("PayPal vault was cancelled.", false);
          },
        })
        .render("#paypal-vault-button");
    } catch (error) {
      showResult(
        `<strong>Initialization Error:</strong> ${(error as Error).message}`,
        false
      );
    } finally {
      initBtn.disabled = false;
      initBtn.textContent = "Initialize";
    }
  });

  // Checkout button handler
  getElementById("checkout-btn").addEventListener("click", async () => {
    if (!vaultedNonce) {
      showResult(
        "<strong>Error:</strong> Please vault a PayPal account first in Step 2.",
        false
      );
      return;
    }

    const checkoutBtn = getElementById<HTMLButtonElement>("checkout-btn");
    const amount = getElementById<HTMLInputElement>("amount").value;
    const currency = getElementById<HTMLInputElement>("currency").value;
    const optOutBackdrop =
      getElementById<HTMLInputElement>("opt-out-backdrop").checked;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing...";

    try {
      const payload = await paypalCheckoutInstance.startVaultInitiatedCheckout({
        vaultInitiatedCheckoutPaymentMethodToken: vaultedNonce,
        amount: amount,
        currency: currency,
        optOutOfModalBackdrop: optOutBackdrop,
      });

      showResult(
        `
        <strong>Vault-Initiated Checkout Successful!</strong><br><br>
        <small><strong>New Nonce:</strong> ${payload.nonce}</small><br>
        <small><strong>Type:</strong> ${payload.type}</small><br>
        <small><strong>Email:</strong> ${payload.details?.email || "N/A"}</small><br>
        <small><strong>Payer ID:</strong> ${payload.details?.payerId || "N/A"}</small><br>
        <small><strong>Name:</strong> ${payload.details?.firstName || ""} ${payload.details?.lastName || ""}</small>
      `,
        true
      );
    } catch (error) {
      const err = error as { code?: string; message?: string };
      let errorMessage = err.message || "An error occurred";

      // Provide more context for common error codes
      if (err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED") {
        errorMessage = "Checkout was canceled by the customer.";
      } else if (
        err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED"
      ) {
        errorMessage =
          "Failed to open popup. This must be triggered by a user click.";
      } else if (
        err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS"
      ) {
        errorMessage =
          "Another vault-initiated checkout is already in progress.";
      }

      showResult(`<strong>Checkout Error:</strong> ${errorMessage}`, false);
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Start Vault-Initiated Checkout";
    }
  });
};

export const VaultInitiatedCheckout: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createVaultInitiatedCheckoutForm();
      container.appendChild(formContainer);

      // Load PayPal SDK with vault enabled
      const paypalSDKScript = document.createElement("script");
      paypalSDKScript.src =
        "https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&vault=true&intent=tokenize";
      paypalSDKScript.onload = () => {
        setupVaultInitiatedCheckout(formContainer, window.paypal);
      };
      document.head.appendChild(paypalSDKScript);
    },
    ["client.min.js", "paypal-checkout.min.js"]
  ),
};
