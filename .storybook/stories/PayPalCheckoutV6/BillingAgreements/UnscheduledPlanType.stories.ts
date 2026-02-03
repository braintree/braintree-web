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

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Billing Agreements",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Billing Agreements - UNSCHEDULED Plan Type.

**UNSCHEDULED** plan type is used for on-demand or irregular payments where
the timing and amount may vary. The customer authorizes future charges without
a fixed schedule.
Examples: Pay-as-you-go services, usage-based billing, top-up payments.
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

const createUnscheduledForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>PayPal V6 UNSCHEDULED Billing Agreement</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Create an UNSCHEDULED billing agreement for on-demand payments.
          This allows charging the customer at irregular intervals without a fixed schedule.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupUnscheduledFlow = async (container: HTMLElement): Promise<void> => {
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

    const session = paypalCheckoutV6Instance.createBillingAgreementSession({
      billingAgreementDescription: "On-demand payments authorization",
      planType: "UNSCHEDULED",

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
          <small>Plan Type: UNSCHEDULED</small><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Email: ${email}</small><br>
          <small>Authorized for on-demand payments</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Billing Agreement Cancelled</strong><br>
          <small>Customer cancelled the UNSCHEDULED billing agreement flow.</small>
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
    button.textContent = "Authorize On-Demand Payments";
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

export const UnscheduledPlanType: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createUnscheduledForm();
      container.appendChild(formContainer);
      await setupUnscheduledFlow(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
