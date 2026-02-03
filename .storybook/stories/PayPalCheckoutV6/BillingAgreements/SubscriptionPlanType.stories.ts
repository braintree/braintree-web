import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalV6ApproveData,
} from "../../../types/global";
import { createSimpleBraintreeStory } from "../../../utils/story-helper";
import { getClientToken } from "../../../utils/sdk-config";
import { getBraintreeSDK } from "../../../utils/braintree-sdk";
import "../../../css/main.css";
import "../../PayPalCheckout/payPalCheckout.css";

/**
 * Format date for PayPal billing cycles
 * PayPal expects format: YYYY-MM-DD (date only, no time)
 */
const formatPayPalDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Billing Agreements",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Billing Agreements - SUBSCRIPTION Plan Type.

**SUBSCRIPTION** plan type is used for subscription services that may include
trial periods, tiered pricing, or promotional rates before regular billing begins.
Examples: SaaS with free trial, streaming service with introductory pricing.
        `,
      },
    },
  },
};

export default meta;

const showDetailedError = (
  resultDiv: HTMLElement,
  title: string,
  err: IBraintreeError
): void => {
  const errorCode = err.code || "UNKNOWN";
  const errorMessage = err.message || "An error occurred";
  const errorType = err.type || "Unknown";

  resultDiv.className =
    "shared-result shared-result--visible shared-result--error";
  resultDiv.innerHTML = `
    <strong>${title}</strong><br>
    <small><strong>Code:</strong> ${errorCode}</small><br>
    <small><strong>Type:</strong> ${errorType}</small><br>
    <small><strong>Message:</strong> ${errorMessage}</small>
  `;

  // eslint-disable-next-line no-console
  console.error(`${title}:`, err);
};

const createSubscriptionForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>PayPal V6 SUBSCRIPTION Billing Agreement</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Create a SUBSCRIPTION billing agreement with a trial period.
          This example includes a 7-day free trial followed by $19.99/month.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupSubscriptionFlow = async (container: HTMLElement): Promise<void> => {
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

    const session = paypalCheckoutV6Instance.createBillingAgreementSession({
      billingAgreementDescription: "Subscription with 7-day free trial",
      planType: "SUBSCRIPTION",
      amount: "19.99",
      currency: "USD",
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
        name: "Premium Subscription",
        productDescription: "Premium subscription with trial period",
        productQuantity: "1.0",
        productPrice: "19.99",
        totalAmount: "19.99",
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
          <small>Plan Type: SUBSCRIPTION</small><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Email: ${email}</small><br>
          <small>Trial: 7 days free, then $19.99/month</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Billing Agreement Cancelled</strong><br>
          <small>Customer cancelled the SUBSCRIPTION billing agreement flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    });

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Start Subscription";
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

export const SubscriptionPlanType: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createSubscriptionForm();
      container.appendChild(formContainer);
      await setupSubscriptionFlow(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
