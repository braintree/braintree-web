import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalCheckoutV6CheckoutWithVaultOptions,
  IPayPalV6ApproveData,
} from "../../../types/global";
import { createSimpleBraintreeStory } from "../../../utils/story-helper";
import { getClientToken } from "../../../utils/sdk-config";
import { getBraintreeSDK } from "../../../utils/braintree-sdk";
import { showDetailedError } from "../common";
import {
  checkoutWithVaultArgTypes,
  applyCheckoutWithVaultOptions,
  type CheckoutWithVaultArgs,
} from "./common";
import "../../../css/main.css";
import "../../PayPalCheckout/payPalCheckout.css";

type VaultFlowArgs = CheckoutWithVaultArgs;

const meta: Meta<VaultFlowArgs> = {
  title: "Braintree/PayPal Checkout V6/Checkout with Vault",
  argTypes: checkoutWithVaultArgTypes,
  args: {
    locale: "en_US",
    displayName: "My Merchant",
    includeLineItems: false,
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Checkout with Vault - Basic Flow.

Creates a one-time payment while simultaneously saving the PayPal account for future use.
This basic flow doesn't include plan type metadata, making it suitable for simple scenarios
where you want to charge now and vault the payment method for future transactions.

Use this when you don't need specific billing plan details attached to the billing agreement.
        `,
      },
    },
  },
};

export default meta;

const createVaultFlowForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Checkout with Vault - Basic</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Pay $10.00 now and save your PayPal account for future transactions.
        </p>
        <p class="shared-description" style="font-size: 0.9em; margin-top: 0.5em;">
          <strong>Note:</strong> This flow doesn't include specific billing plan metadata,
          making it ideal for simple checkout-and-save scenarios.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupVaultFlow = async (
  container: HTMLElement,
  args: VaultFlowArgs
): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
    return;
  }

  try {
    const braintree = getBraintreeSDK(resultDiv);
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });

    const paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
      client: clientInstance,
    });

    await paypalCheckoutV6Instance.loadPayPalSDK();

    const sessionOptions: Record<string, unknown> = {
      amount: "10.00",
      currency: "USD",
      intent: "capture",
      billingAgreementDetails: {
        description: "Save payment method for future purchases",
      },

      onApprove: async (data: IPayPalV6ApproveData) => {
        try {
          const payload = await paypalCheckoutV6Instance.tokenizePayment(data);

          const email = payload.details?.email || "N/A";

          resultDiv.className =
            "shared-result shared-result--visible shared-result--success";
          resultDiv.innerHTML = `
            <strong>Payment authorized & account vaulted!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Payer Email: ${email}</small><br>
            <small>Amount: $10.00</small><br>
            <small>Account saved for future use</small>
          `;
        } catch (error) {
          showDetailedError(
            resultDiv,
            "Tokenization Error",
            error as IBraintreeError
          );
        }
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Payment Cancelled</strong><br>
          <small>Customer cancelled the checkout with vault flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    };

    applyCheckoutWithVaultOptions(sessionOptions, args);

    if (args.includeLineItems) {
      sessionOptions.lineItems = [
        {
          quantity: "1",
          unitAmount: "10.00",
          name: "Product Purchase",
          kind: "debit",
        },
      ];
      sessionOptions.amountBreakdown = {
        itemTotal: "10.00",
      };
    }

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay $10.00 & Save Payment";
    button.className = "paypal-button";
    button.style.cssText = `
      background-color: #0070ba;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
    `;

    button.addEventListener("click", () => {
      const session = paypalCheckoutV6Instance.createCheckoutWithVaultSession(
        sessionOptions as unknown as IPayPalCheckoutV6CheckoutWithVaultOptions
      );
      session.start();
    });

    paypalButtonContainer.appendChild(button);
  } catch (error) {
    showDetailedError(
      resultDiv,
      "Initialization Error",
      error as IBraintreeError
    );
  }
};

export const BasicVaultFlow: StoryObj<VaultFlowArgs> = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createVaultFlowForm();
      container.appendChild(formContainer);
      await setupVaultFlow(formContainer, args!);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
