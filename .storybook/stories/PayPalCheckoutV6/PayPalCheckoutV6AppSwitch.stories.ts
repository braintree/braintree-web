import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import "../../css/main.css";
import "../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/App Switch",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
## PayPal Checkout V6 - Direct App Switch Flow

The App Switch flow allows PayPal payments to redirect directly to the PayPal mobile app
(when available) or PayPal website, then return the user to your application.

### URL Requirements

**returnUrl** and **cancelUrl** are REQUIRED for the App Switch flow:

- **returnUrl**: The absolute URL where users are redirected after successfully approving payment
- **cancelUrl**: The absolute URL where users are redirected if they cancel the payment

Both URLs must be:
- Valid absolute URLs (e.g., \`https://your-site.com/checkout/complete\`)
- Accessible endpoints in your application
- Configured to handle the return/resume flow

### Implementation Features

- Direct app switch to PayPal mobile app when available
- Automatic return detection with hasReturned() method
- Session resumption with resume() method
- Configurable auto-redirect behavior

### Requirements

- V6 requires a client token (not a tokenization key)
- returnUrl and cancelUrl are REQUIRED for app switch
        `,
      },
    },
  },
};

export default meta;

// App Switch Payment Story
const createAppSwitchPaymentForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>PayPal Checkout V6 - App Switch Flow</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This demonstrates the PayPal direct app switch flow that lets customers complete
          payments in the PayPal mobile app when available. For testing, the redirect URL
          will be displayed instead of navigating away.
        </p>
      </div>

      <div class="app-switch-controls">
        <label>
          <input type="checkbox" id="enable-auto-redirect" checked />
          Enable auto-redirect
        </label>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="redirect-info" class="shared-result" style="display: none;"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

interface AppSwitchArgs {
  returnUrl?: string;
  cancelUrl?: string;
  enableAutoRedirect?: boolean;
}

const setupAppSwitchPayment = async (
  container: HTMLElement,
  args?: AppSwitchArgs
): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const redirectInfoDiv = container.querySelector(
    "#redirect-info"
  ) as HTMLElement;
  const autoRedirectCheckbox = container.querySelector(
    "#enable-auto-redirect"
  ) as HTMLInputElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
    return;
  }

  // Use args for URLs, falling back to current URL for demo
  const returnUrl = args?.returnUrl || window.location.href;
  const cancelUrl = args?.cancelUrl || window.location.href;

  const braintree = getBraintreeSDK(resultDiv);

  braintree.client
    .create({
      authorization: clientToken,
    })
    .then((clientInstance) => {
      return braintree.paypalCheckoutV6.create({
        client: clientInstance,
      });
    })
    .then((paypalCheckoutV6Instance) => {
      // Load the PayPal V6 SDK
      return paypalCheckoutV6Instance.loadPayPalSDK().then(() => {
        return paypalCheckoutV6Instance;
      });
    })
    .then((paypalCheckoutV6Instance) => {
      // Create a one-time payment session
      const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
        amount: "15.0",
        currency: "USD",
        intent: "capture",
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,

        onApprove: function (data) {
          const tokenizeData = {
            payerID: data.payerID || data.payerId || data.PayerID,
            orderID: data.orderID || data.orderId || data.OrderID,
          };

          return paypalCheckoutV6Instance
            .tokenizePayment(tokenizeData)
            .then((payload) => {
              resultDiv.className =
                "shared-result shared-result--visible shared-result--success";
              resultDiv.innerHTML = `
                <strong>PayPal payment authorized!</strong><br>
                <small>Nonce: ${payload.nonce}</small><br>
                <small>Payer Email: ${payload.details.email}</small><br>
                <small>Amount: $15.00</small>
              `;
            });
        },

        onCancel: function () {
          resultDiv.className = "shared-result shared-result--visible";
          resultDiv.innerHTML = `
            <strong>Payment Cancelled</strong><br>
            <small>Customer cancelled the PayPal flow.</small>
          `;
        },

        onError: function (err) {
          resultDiv.className =
            "shared-result shared-result--visible shared-result--error";
          resultDiv.innerHTML = `
            <strong>PayPal Error:</strong> ${err.message || "An error occurred"}
          `;
        },
      });

      // First check if returning from app switch
      // In a real implementation, this would detect a user coming back to your site
      // from the PayPal app or website
      if (typeof session.hasReturned === "function" && session.hasReturned()) {
        resultDiv.className =
          "shared-result shared-result--visible shared-result--info";
        resultDiv.innerHTML = `
          <strong>Returning from PayPal</strong><br>
          <small>Resuming payment session...</small>
        `;

        // Resume the payment session
        session.resume().catch((error) => {
          resultDiv.className =
            "shared-result shared-result--visible shared-result--error";
          resultDiv.innerHTML = `
            <strong>Resume Error:</strong> ${error.message || "An error occurred while resuming the session"}
          `;
        });
      } else {
        // Initial flow - render a PayPal button
        const paypalButtonContainer = container.querySelector(
          "#paypal-button"
        ) as HTMLElement;
        const button = document.createElement("button");
        button.textContent = "Pay with PayPal App";
        button.className = "paypal-button";
        button.style.cssText = `
          background-color: #0070ba;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        `;

        button.addEventListener("click", async () => {
          resultDiv.className =
            "shared-result shared-result--visible shared-result--info";
          resultDiv.innerHTML = `
            <strong>Starting PayPal App Switch</strong><br>
            <small>Preparing to switch to PayPal app if available...</small>
          `;

          try {
            // Start the payment with app switch configuration
            const result = await session.start({
              presentationMode: "direct-app-switch",
              autoRedirect: {
                enabled:
                  args?.enableAutoRedirect ?? autoRedirectCheckbox.checked,
              },
            });

            // In a real implementation, this would navigate away from your site
            // For Storybook demo purposes, we'll just show the URL instead
            if (result && result.redirectURL) {
              redirectInfoDiv.style.display = "block";
              redirectInfoDiv.className =
                "shared-result shared-result--visible shared-result--info";
              redirectInfoDiv.innerHTML = `
                <strong>Redirect URL Generated</strong><br>
                <small>In a real implementation, the user would be redirected to:</small><br>
                <textarea readonly style="width:100%; height:60px; margin-top:10px;">${result.redirectURL}</textarea>
                <p><small>Note: In production, this would automatically redirect to the PayPal app or website.</small></p>
              `;

              // Update the main result
              resultDiv.innerHTML = `
                <strong>App Switch Ready</strong><br>
                <small>Redirect URL has been generated. See above for details.</small>
              `;
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "An error occurred";

            resultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            resultDiv.innerHTML = `
              <strong>App Switch Error:</strong> ${errorMessage}
            `;
          }
        });

        paypalButtonContainer.appendChild(button);
      }
    })
    .catch((error) => {
      resultDiv.className =
        "shared-result shared-result--visible shared-result--error";
      resultDiv.innerHTML = `
        <strong>Initialization Error:</strong> ${error.message}
      `;
    });
};

export const AppSwitchPayment: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createAppSwitchPaymentForm();
      container.appendChild(formContainer);
      await setupAppSwitchPayment(formContainer, args as AppSwitchArgs);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
  argTypes: {
    returnUrl: {
      control: { type: "text" },
      description:
        "URL where users return after payment approval. Required for app switch flow.",
      table: {
        category: "App Switch URLs",
        type: { summary: "string" },
      },
    },
    cancelUrl: {
      control: { type: "text" },
      description:
        "URL where users return after payment cancellation. Required for app switch flow.",
      table: {
        category: "App Switch URLs",
        type: { summary: "string" },
      },
    },
    enableAutoRedirect: {
      control: { type: "boolean" },
      description: "Enable auto-redirect to PayPal when starting session",
      table: {
        category: "App Switch Options",
      },
    },
  },
  args: {
    returnUrl: "",
    cancelUrl: "",
    enableAutoRedirect: true,
  },
};
