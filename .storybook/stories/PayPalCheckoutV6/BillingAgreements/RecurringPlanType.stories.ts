import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalV6ApproveData,
} from "../../../types/global";
import { createSimpleBraintreeStory } from "../../../utils/story-helper";
import { getClientToken } from "../../../utils/sdk-config";
import { getBraintreeSDK } from "../../../utils/braintree-sdk";
import {
  FUNDING_SOURCE_CONFIG,
  formatPayPalDate,
  createPayPalButton,
  showSimpleError,
  showDetailedError,
} from "../common";
import "../../../css/main.css";
import "../../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Billing Agreements",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Billing Agreements - RECURRING Plan Type.

**RECURRING** plan type is used for fixed, repeating payments on a regular schedule.
Examples: Monthly gym membership, weekly subscription box, annual software license.
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
      <h2>PayPal V6 RECURRING Billing Agreement</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Create a RECURRING billing agreement for fixed, repeating payments.
          This example sets up a monthly $29.99 subscription with fixed pricing.
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
  args?: { fundingSource?: string }
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

    // Check eligibility for recurring billing agreements
    const eligibilityResult =
      await paypalCheckoutV6Instance.findEligibleMethods({
        amount: "29.99",
        currency: "USD",
        paymentFlow: "RECURRING_PAYMENT",
      });

    // Extract funding source and get configuration
    const selectedFundingSource = args?.fundingSource || "PayPal";
    const fundingSourceConfig =
      FUNDING_SOURCE_CONFIG[selectedFundingSource as string];

    // Handle unexpected or unsupported funding source values gracefully
    if (!fundingSourceConfig) {
      showSimpleError(
        resultDiv,
        "Invalid Funding Source",
        `The funding source "${selectedFundingSource}" is not supported.`
      );
      return;
    }

    const fundingSource = fundingSourceConfig.fundingSource;
    const componentTag = fundingSourceConfig.componentTag;

    // Check if selected funding source is eligible
    const isEligible = eligibilityResult[fundingSource];

    if (!isEligible) {
      showSimpleError(
        resultDiv,
        `${selectedFundingSource} Not Available`,
        `${selectedFundingSource} is not eligible for recurring billing agreements.`
      );
      return;
    }

    const fundingSourceDetails =
      eligibilityResult.getDetails(fundingSource) || {};

    // Check if funding source can be vaulted
    if (
      fundingSourceDetails.canBeVaulted !== undefined &&
      !fundingSourceDetails.canBeVaulted
    ) {
      showSimpleError(
        resultDiv,
        `${selectedFundingSource} Ineligible for Vaulting`,
        `${selectedFundingSource} is not eligible to be saved for recurring billing agreements.`
      );
      return;
    }

    const isPayPalCredit = fundingSource === "credit";

    // Session configuration shared between both funding sources
    const sessionConfig = {
      billingAgreementDescription: isPayPalCredit
        ? "Monthly recurring subscription with PayPal Credit"
        : "Monthly recurring subscription",
      planType: "RECURRING" as const,
      amount: "29.99",
      currency: "USD",
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

      onApprove: async (data: IPayPalV6ApproveData) => {
        const payload = await paypalCheckoutV6Instance.tokenizePayment({
          billingToken: data.billingToken,
        });

        const email =
          payload.details?.email || payload.details?.payerEmail || "N/A";

        resultDiv.className =
          "shared-result shared-result--visible shared-result--success";
        resultDiv.innerHTML = `
          <strong>PayPal account vaulted!</strong><br>
          <small>Plan Type: RECURRING</small><br>
          <small>Funding Source: ${selectedFundingSource}</small><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Email: ${email}</small><br>
          <small>Amount: $29.99/month</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Billing Agreement Cancelled</strong><br>
          <small>Customer cancelled the RECURRING billing agreement flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    };

    // Add offerCredit for PayPal Credit
    if (isPayPalCredit) {
      Object.assign(sessionConfig, { offerCredit: true });
    }

    // Create billing agreement session
    const session =
      paypalCheckoutV6Instance.createBillingAgreementSession(sessionConfig);

    // Render PayPal button using web components
    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;

    const button = createPayPalButton(componentTag, fundingSourceDetails);

    button.addEventListener("click", () => {
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

export const RecurringPlanType: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createRecurringForm();
      container.appendChild(formContainer);
      await setupRecurringFlow(formContainer, args);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
  argTypes: {
    fundingSource: {
      control: { type: "select" },
      options: ["PayPal", "PayPal Credit"],
      description:
        "Funding source for the billing agreement (PayPal or PayPal Credit)",
    },
  },
  args: {
    fundingSource: "PayPal",
  },
};
