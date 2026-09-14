import type { Meta, StoryObj } from "@storybook/html";
import type { IPayPalV6ApproveData, IBraintreeError } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import {
  FUNDING_SOURCE_CONFIG,
  createPayPalButton,
  showSimpleError,
  showDetailedError,
} from "./common";
import "../../css/main.css";
import "../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Contact Module",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 - Contact Module

The Contact Module allows buyers to view and modify email addresses and phone numbers
shared with merchants during PayPal checkout. This is particularly useful for gift
orders where buyers need to specify alternative contact details.

**Contact Preference Options:**
- **\`NO_CONTACT_INFO\`** (Default): Buyers do not see any contact information during checkout
- **\`RETAIN_CONTACT_INFO\`**: Buyers can see contact information but cannot edit it (merchant must provide details)
- **\`UPDATE_CONTACT_INFO\`**: Buyers can see and edit their contact information

**Availability:** Currently available for US-based merchants only.

**Use Cases:**
- Gift orders with alternative recipient contact info
- Pre-filling known customer information
- Collecting verified contact details for order fulfillment
        `,
      },
    },
  },
};

export default meta;

/**
 * Normalize order ID from PayPal callback data
 */
const getOrderId = (data: { orderID?: string; orderId?: string }): string => {
  return data.orderID || data.orderId || "";
};

// ============================================================================
// Editable Contact Information Story
// ============================================================================

const createEditableContactForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Contact Module - Editable Contact</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example uses <code>contactPreference: 'UPDATE_CONTACT_INFO'</code> to allow
          buyers to view and edit their contact information during checkout.
        </p>
        <p class="shared-description" style="margin-top: 10px;">
          Buyers can:
        </p>
        <ul class="shared-description">
          <li>See their primary email and phone from PayPal profile</li>
          <li>Select from previously used contact information</li>
          <li>Add new email addresses or phone numbers</li>
          <li>Edit contact details for this specific transaction</li>
        </ul>
        <p class="shared-description" style="margin-top: 10px; font-size: 13px; color: #666;">
          <strong>Note:</strong> This feature is currently available for US-based merchants only.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupEditableContact = async (container: HTMLElement): Promise<void> => {
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

    // Create payment session with editable contact preference
    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: "25.00",
      currency: "USD",
      intent: "capture",
      contactPreference: "UPDATE_CONTACT_INFO",

      onApprove: async (data: IPayPalV6ApproveData) => {
        const tokenizeData = {
          payerID: data.payerID || data.payerId || data.PayerID,
          orderID: getOrderId(data),
        };

        const payload =
          await paypalCheckoutV6Instance.tokenizePayment(tokenizeData);

        // Display tokenization result including contact information
        const contactInfo: string[] = [];
        if (payload.details.email) {
          contactInfo.push(`<small>Email: ${payload.details.email}</small>`);
        }
        if (payload.details.firstName) {
          contactInfo.push(
            `<small>Name: ${payload.details.firstName} ${payload.details.lastName || ""}</small>`
          );
        }

        resultDiv.className =
          "shared-result shared-result--visible shared-result--success";
        resultDiv.innerHTML = `
          <strong>Payment authorized with contact info!</strong><br>
          <small>Nonce: ${payload.nonce}</small><br>
          ${contactInfo.join("<br>")}
          <br>
          <small>Amount: $25.00</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Payment Cancelled</strong><br>
          <small>Customer cancelled the PayPal flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    });

    // Create and attach PayPal button
    const paypalButtonContainer = container.querySelector("#paypal-button");
    if (paypalButtonContainer) {
      const fundingSourceConfig = FUNDING_SOURCE_CONFIG["PayPal"];
      const button = createPayPalButton(fundingSourceConfig.componentTag, {});

      button.addEventListener("click", () => {
        session.start();
      });

      paypalButtonContainer.appendChild(button);
    }
  } catch (err) {
    showDetailedError(resultDiv, "Setup Error", err as IBraintreeError);
  }
};

export const EditableContact: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createEditableContactForm();
      container.appendChild(formContainer);
      await setupEditableContact(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};

// ============================================================================
// Read-Only Contact Information Story
// ============================================================================

const createReadOnlyContactForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Contact Module - Read-Only Contact</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example uses <code>contactPreference: 'RETAIN_CONTACT_INFO'</code> to display
          merchant-provided contact information that buyers cannot edit.
        </p>
        <p class="shared-description" style="margin-top: 10px;">
          Perfect for scenarios where the merchant:
        </p>
        <ul class="shared-description">
          <li>Already has verified contact information</li>
          <li>Wants to display recipient details for gift orders</li>
          <li>Needs to enforce specific contact details</li>
        </ul>
        <p class="shared-description" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff; font-size: 13px;">
          <strong>Pre-filled Contact:</strong><br>
          Recipient: Jane Recipient<br>
          Email: jane.recipient@example.com<br>
          Address: 456 Gift Lane, Seattle, WA 98101
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupReadOnlyContact = async (container: HTMLElement): Promise<void> => {
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

    // Create payment session with read-only contact preference
    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: "50.00",
      currency: "USD",
      intent: "capture",
      contactPreference: "RETAIN_CONTACT_INFO",

      // Pre-fill contact information for the recipient
      shippingAddressOverride: {
        recipientName: "Jane Recipient",
        recipientEmail: "jane.recipient@example.com",
        line1: "456 Gift Lane",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        countryCode: "US",
      },

      onApprove: async (data: IPayPalV6ApproveData) => {
        const tokenizeData = {
          payerID: data.payerID || data.payerId || data.PayerID,
          orderID: getOrderId(data),
        };

        const payload =
          await paypalCheckoutV6Instance.tokenizePayment(tokenizeData);

        // Display tokenization result
        const shippingInfo: string[] = [];
        if (payload.details.firstName) {
          shippingInfo.push(
            `<small>Name: ${payload.details.firstName} ${payload.details.lastName || ""}</small>`
          );
        }

        resultDiv.className =
          "shared-result shared-result--visible shared-result--success";
        resultDiv.innerHTML = `
          <strong>Payment authorized with read-only contact!</strong><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Payer Email: ${payload.details.email}</small><br>
          ${shippingInfo.join("<br>")}
          <br>
          <small>Amount: $50.00</small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Payment Cancelled</strong><br>
          <small>Customer cancelled the PayPal flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    });

    // Create and attach PayPal button
    const paypalButtonContainer = container.querySelector("#paypal-button");
    if (paypalButtonContainer) {
      const fundingSourceConfig = FUNDING_SOURCE_CONFIG["PayPal"];
      const button = createPayPalButton(fundingSourceConfig.componentTag, {});

      button.addEventListener("click", () => {
        session.start();
      });

      paypalButtonContainer.appendChild(button);
    }
  } catch (err) {
    showDetailedError(resultDiv, "Setup Error", err as IBraintreeError);
  }
};

export const ReadOnlyContact: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createReadOnlyContactForm();
      container.appendChild(formContainer);
      await setupReadOnlyContact(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};

// ============================================================================
// No Contact Information Story
// ============================================================================

const createNoContactForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Contact Module - No Contact Information</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example uses <code>contactPreference: 'NO_CONTACT_INFO'</code> (the default)
          to hide all contact information from buyers during checkout.
        </p>
        <p class="shared-description" style="margin-top: 10px;">
          Use this when:
        </p>
        <ul class="shared-description">
          <li>You don't need to display or collect contact information</li>
          <li>Contact details are managed outside the PayPal flow</li>
          <li>Privacy is a priority</li>
        </ul>
        <p class="shared-description" style="margin-top: 10px; font-size: 13px; color: #666;">
          <strong>Note:</strong> This is the default behavior when <code>contactPreference</code> is omitted.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupNoContact = async (container: HTMLElement): Promise<void> => {
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

    // Create payment session with no contact preference
    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: "10.00",
      currency: "USD",
      intent: "capture",
      contactPreference: "NO_CONTACT_INFO",

      onApprove: async (data: IPayPalV6ApproveData) => {
        const tokenizeData = {
          payerID: data.payerID || data.payerId || data.PayerID,
          orderID: getOrderId(data),
        };

        const payload =
          await paypalCheckoutV6Instance.tokenizePayment(tokenizeData);

        resultDiv.className =
          "shared-result shared-result--visible shared-result--success";
        resultDiv.innerHTML = `
          <strong>Payment authorized!</strong><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Payer Email: ${payload.details.email}</small><br>
          <small>Amount: $10.00</small><br>
          <small style="color: #666; margin-top: 8px; display: block;">
            Note: Contact information was not displayed during checkout
          </small>
        `;
      },

      onCancel: () => {
        resultDiv.className = "shared-result shared-result--visible";
        resultDiv.innerHTML = `
          <strong>Payment Cancelled</strong><br>
          <small>Customer cancelled the PayPal flow.</small>
        `;
      },

      onError: (err: IBraintreeError) => {
        showDetailedError(resultDiv, "PayPal Error", err);
      },
    });

    // Create and attach PayPal button
    const paypalButtonContainer = container.querySelector("#paypal-button");
    if (paypalButtonContainer) {
      const fundingSourceConfig = FUNDING_SOURCE_CONFIG["PayPal"];
      const button = createPayPalButton(fundingSourceConfig.componentTag, {});

      button.addEventListener("click", () => {
        session.start();
      });

      paypalButtonContainer.appendChild(button);
    }
  } catch (err) {
    showDetailedError(resultDiv, "Setup Error", err as IBraintreeError);
  }
};

export const NoContactInformation: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createNoContactForm();
      container.appendChild(formContainer);
      await setupNoContact(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
