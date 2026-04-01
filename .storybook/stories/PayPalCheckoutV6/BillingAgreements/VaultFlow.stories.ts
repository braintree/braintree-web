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
PayPal Checkout V6 Billing Agreements - Vault PayPal accounts for future payments.

**Vault Flow** creates a simple billing agreement to save a PayPal account
for future transactions without specifying a plan type.
        `,
      },
    },
  },
};

export default meta;

const createVaultForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>PayPal V6 Vault Flow</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Save a PayPal account for future payments. This creates a simple billing
          agreement without a specific plan type.
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

    // Check eligibility for vault flow (no payment)
    const eligibilityResult =
      await paypalCheckoutV6Instance.findEligibleMethods({
        amount: "0.00",
        currency: "USD",
        paymentFlow: "VAULT_WITHOUT_PAYMENT",
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
        `${selectedFundingSource} is not eligible for vault flow.`
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
        `${selectedFundingSource} is not eligible to be saved for future payments.`
      );
      return;
    }

    const isPayPalCredit = fundingSource === "credit";

    const sessionConfig = {
      billingAgreementDescription: isPayPalCredit
        ? "Save PayPal Credit account for future payments"
        : "Save PayPal account for future payments",

      onApprove: async (data: IPayPalV6ApproveData) => {
        const payload = await paypalCheckoutV6Instance.tokenizePayment({
          billingToken: data.billingToken,
        });

        const email =
          payload.details?.email || payload.details?.payerEmail || "N/A";
        const firstName = payload.details?.firstName || "";
        const lastName = payload.details?.lastName || "";
        const payerName =
          firstName && lastName ? `${firstName} ${lastName}` : "";

        resultDiv.className =
          "shared-result shared-result--visible shared-result--success";
        resultDiv.innerHTML = `
          <strong>PayPal account vaulted!</strong><br>
          <small>Funding Source: ${selectedFundingSource}</small><br>
          <small>Nonce: ${payload.nonce}</small><br>
          ${payerName ? `<small>Payer: ${payerName}</small><br>` : ""}
          <small>Email: ${email}</small><br>
          <small>This payment method can be reused for future transactions</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Vault Flow Cancelled</strong><br>
          <small>Customer cancelled the PayPal vault flow.</small>
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

export const VaultFlow: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const formContainer = createVaultForm();
      container.appendChild(formContainer);
      await setupVaultFlow(formContainer, args);
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
