import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalV6ApproveData,
  IPayPalCheckoutV6Instance,
} from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import { getClientToken, vaultPaymentMethod } from "../../utils/sdk-config";
import { showDetailedError } from "./common";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Edit Saved Payment",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 - Edit Saved Payment (Edit FI)

**Edit Saved Payment** allows returning buyers with a vaulted Billing Agreement to view
and change their saved PayPal funding instrument (credit card, bank account, etc.)
inline during checkout.

**How it works:**
1. **Step 1:** Vault a PayPal Billing Agreement in-page, the same way the
   Vault-Initiated Checkout demo does, to obtain a nonce.
2. **Step 2:** Exchange that nonce for a new client token generated with a
   \`preferredPaymentMethodToken\`, then create a fresh PayPal Checkout V6 instance from it.
3. A \`<paypal-saved-payment-methods>\` web component is embedded in the page. It renders
   a PayPal-hosted iframe that displays the buyer's current funding instrument (last-4,
   card art) without ever exposing those details to the merchant page.
4. When the buyer clicks the component, \`session.start()\` opens a PayPal popup/modal
   where they can change their saved payment method.
5. On approval, call \`tokenizePayment()\` to receive a nonce for server-side processing.
        `,
      },
    },
  },
};

export default meta;

const createEditSavedPaymentForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container" style="max-width: 700px;">
      <h2 style="margin-bottom: 10px; font-size: 24px;">PayPal V6 Edit Saved Payment</h2>

      <div id="status-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">SDK Initialization Status</h3>
        <div id="client-status" style="margin-bottom: 8px; font-size: 13px;">⏳ Creating client...</div>
        <div id="paypal-status" style="margin-bottom: 8px; font-size: 13px;">⏳ Creating PayPal Checkout V6...</div>
        <div id="sdk-status" style="font-size: 13px;">⏳ Loading PayPal V6 SDK...</div>
      </div>

      <div id="vault-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 1: Vault a PayPal Billing Agreement</h3>
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
          Click the button below to vault a PayPal account. Edit Saved Payment needs an
          existing Billing Agreement to edit.
        </p>
        <button type="button" id="vault-btn" class="shared-button">Vault PayPal Account</button>
        <div id="vault-result" style="padding: 10px; border-radius: 4px; display: none; margin-top: 15px;"></div>
      </div>

      <div id="session-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 2: Edit Saved Payment</h3>
        <div id="session-status" style="margin-bottom: 15px; font-size: 13px;">⏳ Setting up Edit Saved Payment session...</div>

        <div id="spm-section" style="display: none;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 45px; height: 30px; border: 1.2px solid #ccc; border-radius: 2px; display: flex; align-items: center; justify-content: center; padding: 4px; flex-shrink: 0;">
              <img
                src="https://www.paypalobjects.com/js-sdk-logos/2.3.2/pp-rebrand-default.svg"
                alt="PayPal"
                style="width: 43px; height: 28px; object-fit: contain;"
              />
            </div>
            <span style="font-size: 15px; font-weight: 600; color: #222; font-family: Arial, sans-serif;">PayPal</span>
            <paypal-saved-payment-methods id="spm-button"></paypal-saved-payment-methods>
          </div>
        </div>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupEditSavedPayment = async (container: HTMLElement): Promise<void> => {
  const getElementById = <T extends HTMLElement = HTMLElement>(id: string): T =>
    container.querySelector(`#${id}`) as T;

  const resultDiv = getElementById("result");

  const setStatus = (id: string, message: string): void => {
    getElementById(id).innerHTML = message;
  };

  const showResult = (message: string, isSuccess: boolean): void => {
    resultDiv.className = `shared-result shared-result--visible ${isSuccess ? "shared-result--success" : "shared-result--error"}`;
    resultDiv.innerHTML = message;
  };

  const showVaultResult = (message: string, isSuccess: boolean): void => {
    const vaultResultDiv = getElementById("vault-result");
    vaultResultDiv.style.display = "block";
    vaultResultDiv.style.backgroundColor = isSuccess ? "#d4edda" : "#f8d7da";
    vaultResultDiv.style.color = isSuccess ? "#155724" : "#721c24";
    vaultResultDiv.innerHTML = message;
  };

  // Step 2: exchange the vaulted payment method token for a client token embedding it, then set up the edit session
  const setupEditSession = async (
    vaultedPaymentMethodToken: string
  ): Promise<void> => {
    const sessionSection = getElementById("session-section");
    sessionSection.style.display = "block";

    try {
      const editClientToken = await getClientToken({
        preferredPaymentMethodToken: vaultedPaymentMethodToken,
      });
      const braintree = getBraintreeSDK(resultDiv);

      const editClientInstance = await braintree.client.create({
        authorization: editClientToken,
      });

      const editPaypalV6 = (await braintree.paypalCheckoutV6.create({
        client: editClientInstance,
      })) as IPayPalCheckoutV6Instance;

      await editPaypalV6.loadPayPalSDK();

      const editSession = editPaypalV6.createEditSavedPaymentSession({
        amount: "10.00",
        currency: "USD",
        intent: "authorize",
        commit: false,
        onApprove: async (data: IPayPalV6ApproveData) => {
          try {
            const payload = await editPaypalV6.tokenizePayment({
              orderId: data.orderId,
              payerId: data.payerId,
            });
            showResult(
              `<strong>Edit FI approved!</strong><br><small>Nonce: ${payload.nonce}</small>`,
              true
            );
          } catch (tokenizeErr) {
            showDetailedError(
              resultDiv,
              "Tokenization failed",
              tokenizeErr as IBraintreeError
            );
          }
        },
        onCancel: () => {
          showResult("<strong>Edit canceled.</strong>", false);
        },
        onError: (err: IBraintreeError) => {
          showDetailedError(resultDiv, "PayPal Error", err);
        },
      });

      setStatus("session-status", "✅ Session ready");
      getElementById("spm-section").style.display = "block";

      getElementById("spm-button").addEventListener("click", async () => {
        resultDiv.className = "shared-result";
        try {
          await editSession.start({ presentationMode: "auto" });
        } catch (startErr) {
          showDetailedError(
            resultDiv,
            "Start failed",
            startErr as IBraintreeError
          );
        }
      });
    } catch (sessionErr) {
      setStatus("session-status", "❌ Session creation failed.");
      showDetailedError(
        resultDiv,
        "Session creation failed",
        sessionErr as IBraintreeError
      );
    }
  };

  try {
    const clientToken = await getClientToken();
    const braintree = getBraintreeSDK(resultDiv);

    setStatus("client-status", "⏳ Creating client...");
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });
    setStatus("client-status", "✅ Client created");

    setStatus("paypal-status", "⏳ Creating PayPal Checkout V6...");
    const paypalV6 = (await braintree.paypalCheckoutV6.create({
      client: clientInstance,
    })) as IPayPalCheckoutV6Instance;
    setStatus("paypal-status", "✅ PayPal Checkout V6 created");

    setStatus("sdk-status", "⏳ Loading PayPal V6 SDK...");
    await paypalV6.loadPayPalSDK();
    setStatus("sdk-status", "✅ PayPal V6 SDK loaded");

    getElementById("vault-section").style.display = "block";
    showResult(
      "<strong>Initialized successfully!</strong> Now vault a PayPal account in Step 1.",
      true
    );

    getElementById("vault-btn").addEventListener("click", async () => {
      const vaultBtn = getElementById<HTMLButtonElement>("vault-btn");
      vaultBtn.disabled = true;
      vaultBtn.textContent = "Opening PayPal...";

      try {
        const vaultSession = paypalV6.createBillingAgreementSession({
          billingAgreementDescription: "Vault for Edit Saved Payment demo",
          onApprove: async (data: IPayPalV6ApproveData) => {
            try {
              const payload = await paypalV6.tokenizePayment({
                billingToken: data.billingToken,
              });
              // The client token's preferredPaymentMethodToken must reference an
              // already vaulted payment method, not the single-use nonce.
              const vaultedToken = await vaultPaymentMethod(payload.nonce);

              showVaultResult(
                `<strong>PayPal account vaulted!</strong><br>
                <small>Email: ${payload.details?.email || "Unknown"}</small><br>
                <small>Nonce: ${payload.nonce.substring(0, 20)}...</small>`,
                true
              );

              vaultBtn.disabled = false;
              vaultBtn.textContent = "Vault PayPal Account";

              await setupEditSession(vaultedToken);
            } catch (tokenizeErr) {
              showVaultResult(
                `<strong>Tokenization Error:</strong> ${(tokenizeErr as Error).message}`,
                false
              );
              vaultBtn.disabled = false;
              vaultBtn.textContent = "Vault PayPal Account";
            }
          },
          onCancel: () => {
            showVaultResult("PayPal vault was cancelled.", false);
            vaultBtn.disabled = false;
            vaultBtn.textContent = "Vault PayPal Account";
          },
          onError: (err: IBraintreeError) => {
            showDetailedError(
              getElementById("vault-result"),
              "Vault Error",
              err
            );
            getElementById("vault-result").style.display = "block";
            vaultBtn.disabled = false;
            vaultBtn.textContent = "Vault PayPal Account";
          },
        });

        await vaultSession.start();
      } catch (vaultErr) {
        showVaultResult(
          `<strong>Vault Error:</strong> ${(vaultErr as Error).message}`,
          false
        );
        vaultBtn.disabled = false;
        vaultBtn.textContent = "Vault PayPal Account";
      }
    });
  } catch (err) {
    showResult(
      `<strong>Initialization Error:</strong> ${(err as Error).message}`,
      false
    );
  }
};

export const EditSavedPayment: StoryObj = {
  name: "Edit Saved Payment (Edit FI)",
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createEditSavedPaymentForm();
      container.appendChild(formContainer);
      setupEditSavedPayment(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
