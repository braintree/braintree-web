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

type RecurringPlanTypeArgs = CheckoutWithVaultArgs;

const meta: Meta<RecurringPlanTypeArgs> = {
  title: "Braintree/PayPal Checkout V6/Checkout with Vault",
  argTypes: checkoutWithVaultArgTypes,
  args: {
    locale: "en_US",
    displayName: "Monthly Service",
    includeLineItems: false,
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Checkout with Vault - RECURRING Plan Type.

Creates a one-time payment while simultaneously saving the PayPal account with recurring
plan details. The **RECURRING** plan type is used for simple recurring payments with
consistent amounts and intervals.

Examples: Monthly gym membership, recurring donations, simple subscription services.
        `,
      },
    },
  },
};

export default meta;

const createRecurringForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Checkout with Vault - RECURRING</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Pay $15.00 now and save your PayPal account for recurring monthly payments of $29.99.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupRecurringFlow = async (
  container: HTMLElement,
  args: RecurringPlanTypeArgs
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
      amount: "15.00",
      currency: "USD",
      intent: "capture",
      planType: "RECURRING",
      planMetadata: {
        billingCycles: [
          {
            billingFrequency: "1",
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: "12",
            sequence: "1",
            startDate: formatPayPalDate(new Date(Date.now() + 86400000)),
            trial: false,
            pricingScheme: {
              pricingModel: "VARIABLE",
              price: "29.99",
            },
          },
        ],
        currencyIsoCode: "USD",
        name: "Monthly Recurring Plan",
        productDescription: "Monthly recurring subscription service",
        productQuantity: "1.0",
        productPrice: "29.99",
        totalAmount: "29.99",
      },
      billingAgreementDetails: {
        description: "Monthly recurring payment of $29.99",
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
            <small>Initial Payment: $15.00</small><br>
            <small>Plan: RECURRING ($29.99/month for 12 months)</small>
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
          unitAmount: "15.00",
          name: "First Month Service Fee",
          kind: "debit",
        },
      ];
      sessionOptions.amountBreakdown = {
        itemTotal: "15.00",
      };
    }

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay $15.00 & Set Up Recurring";
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

export const Recurring: StoryObj<RecurringPlanTypeArgs> = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createRecurringForm();
      container.appendChild(formContainer);
      await setupRecurringFlow(formContainer, args!);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
