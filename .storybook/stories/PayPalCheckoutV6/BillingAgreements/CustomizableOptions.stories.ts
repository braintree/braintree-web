import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalV6ApproveData,
} from "../../../types/global";
import { createSimpleBraintreeStory } from "../../../utils/story-helper";
import { getClientToken } from "../../../utils/sdk-config";
import { getBraintreeSDK } from "../../../utils/braintree-sdk";
import { showDetailedError, showSimpleError } from "../common";
import {
  billingAgreementArgTypes,
  applyBillingAgreementOptions,
  type BillingAgreementArgs,
} from "./common";
import "../../../css/main.css";
import "../../PayPalCheckout/payPalCheckout.css";

interface CustomizableOptionsArgs extends BillingAgreementArgs {
  billingAgreementDescription: string;
}

const meta: Meta<CustomizableOptionsArgs> = {
  title: "Braintree/PayPal Checkout V6/Billing Agreements",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 Billing Agreements - Customizable Experience Options.

This story demonstrates all the customization options available for billing agreements,
including V5 parity options for locale, landing page type, shipping address settings,
and display name.

**New V5 Parity Options:**
- **locale**: Set the PayPal UI language (e.g., 'en_US', 'fr_FR', 'de_DE', 'es_ES')
- **landingPageType**: Control which page customers see first ('login', 'billing', or none)
- **enableShippingAddress**: Test default behavior with 'omit' (suppressed), or explicitly set 'true'/'false'
- **usePrefilledAddress**: Toggle to pre-fill a test shipping address (required to test shippingAddressEditable)
- **shippingAddressEditable**: Test default behavior with 'omit' (editable), or explicitly set 'true'/'false' to control editability
  - **Note:** Enable \`usePrefilledAddress\` to see this option in action
  - When set to 'false', the pre-filled address will be locked and cannot be changed by the customer
- **displayName**: Custom merchant name shown in PayPal UI

Use the Controls panel below to experiment with different settings and see how they
affect the PayPal experience.

**Testing Defaults:** Set options to 'omit' to test the actual undefined behavior and verify default handling!
        `,
      },
    },
  },
  argTypes: {
    billingAgreementDescription: {
      control: "text",
      description: "Description of the billing agreement shown to the customer",
      table: {
        type: { summary: "string" },
        defaultValue: { summary: "Billing agreement for future payments" },
      },
    },
    ...billingAgreementArgTypes,
  },
  args: {
    billingAgreementDescription: "Save your PayPal account for future payments",
    locale: "en_US",
    landingPageType: "none",
    enableShippingAddress: "omit",
    shippingAddressEditable: "omit",
    displayName: "My Custom Store",
  },
};

export default meta;

const createCustomizableForm = (args: CustomizableOptionsArgs): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Customizable Billing Agreement</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example demonstrates all customization options for billing agreements.
          Use the Controls panel to experiment with different settings.
        </p>
        <div style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 13px;">
          <strong>Current Settings:</strong><br>
          <small>Locale: <code>${args.locale}</code></small><br>
          <small>Landing Page: <code>${args.landingPageType}</code></small><br>
          <small>Shipping Enabled: <code>${args.enableShippingAddress}</code>${args.enableShippingAddress === "omit" ? " <strong>(testing default: suppressed)</strong>" : ""}</small><br>
          <small>Address Editable: <code>${args.shippingAddressEditable}</code>${args.shippingAddressEditable === "omit" ? " <strong>(testing default: editable)</strong>" : args.shippingAddressEditable === "false" || args.shippingAddressEditable === false ? " (prefilled & locked)" : ""}</small><br>
          <small>Display Name: <code>${args.displayName}</code></small>
        </div>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupCustomizableFlow = async (
  container: HTMLElement,
  args: CustomizableOptionsArgs
): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;

  if (!clientToken) {
    showSimpleError(
      resultDiv,
      "Configuration Error",
      "Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file"
    );
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

    // Build options object dynamically based on args
    const sessionOptions: {
      billingAgreementDescription: string;
      locale?: string;
      landingPageType?: "login" | "billing";
      enableShippingAddress?: boolean;
      shippingAddressOverride?: {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        countryCode: string;
      };
      shippingAddressEditable?: boolean;
      displayName?: string;
      onApprove: (_data: IPayPalV6ApproveData) => Promise<void>;
      onCancel: () => void;
      onError: (_err: IBraintreeError) => void;
    } = {
      billingAgreementDescription: args.billingAgreementDescription,

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
          <small>Nonce: ${payload.nonce}</small><br>
          ${payerName ? `<small>Payer: ${payerName}</small><br>` : ""}
          <small>Email: ${email}</small><br>
          <small>Settings applied successfully with your custom options</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Billing Agreement Cancelled</strong><br>
          <small>Customer cancelled the billing agreement flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    };

    // Apply billing agreement options (including shipping address settings)
    applyBillingAgreementOptions(sessionOptions, args);

    const session =
      paypalCheckoutV6Instance.createBillingAgreementSession(sessionOptions);

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Create Billing Agreement";
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

export const CustomizableOptions: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container, storyArgs) => {
      const args = storyArgs as unknown as CustomizableOptionsArgs;
      const formContainer = createCustomizableForm(args);
      container.appendChild(formContainer);
      await setupCustomizableFlow(formContainer, args);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
