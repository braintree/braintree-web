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

type UnscheduledPlanTypeArgs = CheckoutWithVaultArgs;

const meta: Meta<UnscheduledPlanTypeArgs> = {
  title: "Braintree/PayPal Checkout V6/Checkout with Vault",
  argTypes: checkoutWithVaultArgTypes,
  args: {
    locale: "en_US",
    displayName: "Usage-Based Service",
    includeLineItems: false,
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Checkout with Vault - UNSCHEDULED Plan Type.

Creates a one-time payment while simultaneously saving the PayPal account with unscheduled
plan details. The **UNSCHEDULED** plan type is used for on-demand or usage-based payments
where the amount or timing is variable.

Examples: Pay-as-you-go services, account top-ups, usage-based billing, on-demand charges.
        `,
      },
    },
  },
};

export default meta;

const createUnscheduledForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Checkout with Vault - UNSCHEDULED</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Pay $25.00 now and save your PayPal account for future on-demand charges.
        </p>
        <p class="shared-description" style="font-size: 0.9em; margin-top: 0.5em;">
          <strong>Note:</strong> With UNSCHEDULED plan type, you can charge variable amounts
          at any time without requiring the customer to approve each transaction.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupUnscheduledFlow = async (
  container: HTMLElement,
  args: UnscheduledPlanTypeArgs
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
      amount: "25.00",
      currency: "USD",
      intent: "capture",
      planType: "UNSCHEDULED",
      billingAgreementDetails: {
        description: "On-demand charges based on usage",
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
            <small>Initial Payment: $25.00</small><br>
            <small>Plan: UNSCHEDULED (on-demand charges as usage occurs)</small>
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
          unitAmount: "25.00",
          name: "Initial Account Credit",
          kind: "debit",
        },
      ];
      sessionOptions.amountBreakdown = {
        itemTotal: "25.00",
      };
    }

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay $25.00 & Enable On-Demand";
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

export const Unscheduled: StoryObj<UnscheduledPlanTypeArgs> = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createUnscheduledForm();
      container.appendChild(formContainer);
      await setupUnscheduledFlow(formContainer, args!);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
