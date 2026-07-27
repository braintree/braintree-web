import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import { getClientToken } from "../../utils/sdk-config";

type PayPalCheckoutEditFIInstance = {
  loadPayPalSDK: (_options: object) => Promise<void>;
  createPayment: (_options: object) => Promise<string>;
  tokenizePayment: (_data: object) => Promise<{ nonce: string }>;
};

type PayPalSDKWithSavedPaymentMethods = typeof window.paypal & {
  SavedPaymentMethods?: (_options: {
    createOrder: () => Promise<string>;
    onApprove: (_data: object) => void;
    onError: (_err: Error) => void;
  }) => { render: (_selector: string) => void };
};

const meta: Meta = {
  title: "Braintree/PayPal Checkout/Edit FI",
  parameters: {
    layout: "centered",
    braintreeScripts: ["paypal-checkout"],
    docs: {
      description: {
        component: `
**Edit FI (Funding Instrument)** allows returning buyers with a vaulted Billing Agreement to view and change their saved PayPal payment method inline during checkout.
        `,
      },
    },
  },
};

export default meta;

const createEditFIForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container" style="max-width: 700px;">
      <h2 style="margin-bottom: 10px; font-size: 24px;">PayPal Edit FI</h2>

      <div id="status-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">SDK Initialization Status</h3>
        <div id="client-status" style="margin-bottom: 8px; font-size: 13px;">⏳ Creating client...</div>
        <div id="paypal-status" style="margin-bottom: 8px; font-size: 13px;">⏳ Creating paypalCheckout...</div>
        <div id="sdk-status" style="font-size: 13px;">⏳ Loading PayPal SDK...</div>
      </div>

      <div id="paypal-button-section" style="display: none; margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <div id="paypal-edit-fi-button"></div>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupEditFI = async (container: HTMLElement): Promise<void> => {
  const getElementById = <T extends HTMLElement = HTMLElement>(
    id: string
  ): T => {
    return container.querySelector(`#${id}`) as T;
  };

  const showResult = (message: string, isSuccess: boolean): void => {
    const resultDiv = getElementById("result");
    resultDiv.className = `shared-result shared-result--visible ${isSuccess ? "shared-result--success" : "shared-result--error"}`;
    resultDiv.innerHTML = message;
  };

  const setStatus = (id: string, message: string): void => {
    getElementById(id).innerHTML = message;
  };

  try {
    const clientToken = await getClientToken();
    const braintree = getBraintreeSDK();

    setStatus("client-status", "⏳ Creating client...");
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });
    setStatus("client-status", "✅ Client created");

    setStatus("paypal-status", "⏳ Creating paypalCheckout...");
    const paypalCheckoutInstance = (await braintree.paypalCheckout.create({
      client: clientInstance,
    })) as PayPalCheckoutEditFIInstance;
    setStatus("paypal-status", "✅ paypalCheckout created");

    setStatus("sdk-status", "⏳ Loading PayPal SDK...");
    await paypalCheckoutInstance.loadPayPalSDK({
      intent: "authorize",
      currency: "USD",
    });
    setStatus("sdk-status", "✅ PayPal SDK loaded");

    getElementById("paypal-button-section").style.display = "block";

    const paypalSDK = window.paypal as PayPalSDKWithSavedPaymentMethods;

    if (paypalSDK && paypalSDK.SavedPaymentMethods) {
      paypalSDK
        .SavedPaymentMethods({
          createOrder() {
            return paypalCheckoutInstance.createPayment({
              flow: "checkout",
              intent: "authorize",
              amount: "10.00",
              currency: "USD",
              editBillingAgreement: true,
            });
          },
          onApprove(data: object) {
            return paypalCheckoutInstance
              .tokenizePayment(data)
              .then((payload) => {
                showResult(
                  `<strong>Edit FI approved!</strong><br><small>Nonce: ${payload.nonce}</small>`,
                  true
                );
              });
          },
          onError(err: Error) {
            showResult(
              `<strong>PayPal Error:</strong> ${err.message || "An error occurred"}`,
              false
            );
          },
        })
        .render("#paypal-edit-fi-button");
    } else {
      getElementById("paypal-edit-fi-button").innerHTML =
        '<p style="color: #666; font-size: 13px;"><code>paypal.SavedPaymentMethods</code> is not available in this version of the PayPal SDK.</p>';
    }

    showResult("<strong>Initialization complete.</strong>", true);
  } catch (error) {
    showResult(
      `<strong>Initialization Error:</strong> ${(error as Error).message}`,
      false
    );
  }
};

export const EditFI: StoryObj = {
  name: "Edit FI",
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createEditFIForm();
      container.appendChild(formContainer);
      setupEditFI(formContainer);
    },
    ["client.min.js", "paypal-checkout.min.js"]
  ),
};
