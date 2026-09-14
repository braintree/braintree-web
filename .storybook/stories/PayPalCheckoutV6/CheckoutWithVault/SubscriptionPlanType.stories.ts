import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalCheckoutV6CheckoutWithVaultOptions,
  IPayPalV6ApproveData,
} from "../../../types/global";
import { createSimpleBraintreeStory } from "../../../utils/story-helper";
import { getClientToken } from "../../../utils/sdk-config";
import { getBraintreeSDK } from "../../../utils/braintree-sdk";
import { formatPayPalDate, showDetailedError } from "../common";
import {
  checkoutWithVaultArgTypes,
  applyCheckoutWithVaultOptions,
  type CheckoutWithVaultArgs,
} from "./common";
import "../../../css/main.css";
import "../../PayPalCheckout/payPalCheckout.css";

type SubscriptionPlanTypeArgs = CheckoutWithVaultArgs;

const meta: Meta<SubscriptionPlanTypeArgs> = {
  title: "Braintree/PayPal Checkout V6/Checkout with Vault",
  argTypes: checkoutWithVaultArgTypes,
  args: {
    locale: "en_US",
    displayName: "Premium Subscription Service",
    includeLineItems: false,
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Checkout with Vault - SUBSCRIPTION Plan Type.

Creates a one-time payment while simultaneously saving the PayPal account with subscription
plan details. The **SUBSCRIPTION** plan type is used for subscription services that may include
trial periods, tiered pricing, or promotional rates before regular billing begins.

Examples: SaaS with free trial, streaming service with introductory pricing.
        `,
      },
    },
  },
};

export default meta;

const createSubscriptionForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Checkout with Vault - SUBSCRIPTION</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Pay $10.00 now and save your PayPal account for a subscription with a 7-day free trial,
          then $19.99/month for 12 months.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupSubscriptionFlow = async (
  container: HTMLElement,
  args: SubscriptionPlanTypeArgs
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

    const regularStartDate = new Date(Date.now() + 8 * 86400000); // 8 days from now (after trial)

    const sessionOptions: Record<string, unknown> = {
      amount: "10.00",
      currency: "USD",
      intent: "capture",
      planType: "SUBSCRIPTION",
      planMetadata: {
        billingCycles: [
          {
            billingFrequency: "1",
            billingFrequencyUnit: "WEEK",
            numberOfExecutions: "1",
            sequence: "1",
            startDate: formatPayPalDate(new Date(Date.now() + 86400000)),
            trial: true,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "0.00",
            },
          },
          {
            billingFrequency: "1",
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: "12",
            sequence: "2",
            startDate: formatPayPalDate(regularStartDate),
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "19.99",
            },
          },
        ],
        currencyIsoCode: "USD",
        name: "Premium Subscription Service",
        productDescription: "Premium subscription with trial period",
        productQuantity: "1.0",
        productPrice: "19.99",
        totalAmount: "19.99",
      },
      billingAgreementDetails: {
        description:
          "Premium subscription with 7-day free trial, then $19.99/month",
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
            <small>Initial Payment: $10.00</small><br>
            <small>Plan: SUBSCRIPTION (7-day trial, then $19.99/month for 12 months)</small>
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
          name: "Initial Setup Fee",
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
    button.textContent = "Pay $10.00 & Subscribe";
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

export const Subscription: StoryObj<SubscriptionPlanTypeArgs> = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createSubscriptionForm();
      container.appendChild(formContainer);
      await setupSubscriptionFlow(formContainer, args!);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
