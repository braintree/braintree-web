import type { Meta, StoryObj } from "@storybook/html";
import type {
  IBraintreeError,
  IPayPalV6ApproveData,
  IPayPalCheckoutV6Instance,
} from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import { getClientToken } from "../../utils/sdk-config";
import { showDetailedError } from "./common";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 - Vault-Initiated Checkout (VIC)

**Vault-Initiated Checkout** allows you to charge a previously vaulted PayPal account
with a new transaction. This is ideal for:
- Recurring payments (subscriptions, memberships)
- High-frequency, low-AOV transactions (food delivery, rideshare)
- Marketplace platforms with repeat purchases

**Flow:**
1. Vault a PayPal account (create billing agreement)
2. Store the payment method nonce from the vault response
3. Later, initiate a new checkout using the vaulted nonce
4. Customer authorizes the charge in a popup
5. Receive a new nonce to process the transaction

**Requirements:**
- Customer must have a vaulted PayPal account (from a previous vault flow)
- V6 requires a client token (not a tokenization key)
- Must be triggered by a user action (for popup)
        `,
      },
    },
  },
};

export default meta;

const createVaultInitiatedCheckoutForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container" style="max-width: 700px;">
      <h2 style="margin-bottom: 10px; font-size: 24px;">PayPal V6 Vault-Initiated Checkout</h2>

      <div class="paypal-description" style="margin-bottom: 20px; padding: 15px; background-color: #f5f7fa; border-left: 4px solid var(--color-deep-blue); border-radius: 4px;">
        <p class="shared-description" style="margin: 0;">
          Complete end-to-end flow: First vault a PayPal account (creates a Billing Agreement),
          then use it for vault-initiated checkout.
        </p>
      </div>

      <!-- Credentials Section -->
      <div style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 1: Merchant Credentials</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label class="shared-label">Public Key</label>
            <input type="text" id="public-key" class="shared-input" placeholder="Enter your public key" />
            <div id="help-public-key" style="color: red; font-size: 12px; margin-top: 4px;"></div>
          </div>
          <div>
            <label class="shared-label">Private Key</label>
            <input type="password" id="private-key" class="shared-input" placeholder="Enter your private key" />
            <div id="help-private-key" style="color: red; font-size: 12px; margin-top: 4px;"></div>
          </div>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">Customer ID</label>
          <input type="text" id="customer-id" class="shared-input" value="vault_test_customer" placeholder="Enter customer ID" />
        </div>
        <button type="button" id="initialize-btn" class="shared-button">Initialize</button>
      </div>

      <!-- Vault Section -->
      <div id="vault-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 2: Vault a PayPal Account</h3>
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
          Click the button below to create a Billing Agreement. This vaults the PayPal account for future use.
        </p>
        <button type="button" id="vault-btn" class="shared-button">Vault PayPal Account</button>
        <div id="vault-result" style="padding: 10px; border-radius: 4px; display: none; margin-top: 15px;"></div>
      </div>

      <!-- Checkout Section -->
      <div id="checkout-section" style="margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; display: none;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Step 3: Vault-Initiated Checkout</h3>
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
          Now use the vaulted PayPal account to start a vault-initiated checkout.
        </p>
        <div id="vaulted-account-info" style="padding: 15px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label class="shared-label">Amount</label>
            <input type="text" id="amount" class="shared-input" value="10.00" />
          </div>
          <div>
            <label class="shared-label">Currency</label>
            <input type="text" id="currency" class="shared-input" value="USD" />
          </div>
        </div>
        <div class="paypal-form-group" style="margin-bottom: 15px;">
          <label class="paypal-checkbox-label">
            <input type="checkbox" id="opt-out-backdrop" class="paypal-checkbox" />
            <span class="paypal-checkbox-text">Opt out of modal backdrop</span>
          </label>
        </div>
        <button type="button" id="checkout-btn" class="shared-button">Start Vault-Initiated Checkout</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <button type="button" id="focus-window-btn" class="shared-button" disabled style="opacity: 0.5;">Focus Window</button>
          <button type="button" id="close-window-btn" class="shared-button" disabled style="opacity: 0.5;">Close Window</button>
        </div>
      </div>

      <!-- Result Display -->
      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupVaultInitiatedCheckout = (container: HTMLElement): void => {
  let paypalCheckoutV6Instance: IPayPalCheckoutV6Instance;
  let vaultedNonce: string | null = null;
  let vaultedEmail: string | null = null;

  // Helper function to get element by ID
  const getElementById = <T extends HTMLElement = HTMLElement>(
    id: string
  ): T => {
    return container.querySelector(`#${id}`) as T;
  };

  // Helper function to show result
  const showResult = (message: string, isSuccess: boolean): void => {
    const resultDiv = getElementById("result");
    resultDiv.className = `shared-result shared-result--visible ${isSuccess ? "shared-result--success" : "shared-result--error"}`;
    resultDiv.innerHTML = message;
  };

  // Helper function to show vault result
  const showVaultResult = (message: string, isSuccess: boolean): void => {
    const vaultResultDiv = getElementById("vault-result");
    vaultResultDiv.style.display = "block";
    vaultResultDiv.style.backgroundColor = isSuccess ? "#d4edda" : "#f8d7da";
    vaultResultDiv.style.color = isSuccess ? "#155724" : "#721c24";
    vaultResultDiv.innerHTML = message;
  };

  // Validate credentials
  const validateCredentials = (): boolean => {
    let isValid = true;
    const publicKey =
      getElementById<HTMLInputElement>("public-key").value.trim();
    const privateKey =
      getElementById<HTMLInputElement>("private-key").value.trim();

    const publicKeyHelp = getElementById("help-public-key");
    const privateKeyHelp = getElementById("help-private-key");

    if (!publicKey) {
      isValid = false;
      publicKeyHelp.textContent = "Public key is required.";
    } else {
      publicKeyHelp.textContent = "";
    }

    if (!privateKey) {
      isValid = false;
      privateKeyHelp.textContent = "Private key is required.";
    } else {
      privateKeyHelp.textContent = "";
    }

    return isValid;
  };

  // Initialize button handler
  getElementById("initialize-btn").addEventListener("click", async () => {
    if (!validateCredentials()) {
      return;
    }

    const initBtn = getElementById<HTMLButtonElement>("initialize-btn");
    initBtn.disabled = true;
    initBtn.textContent = "Initializing...";

    try {
      const publicKey = getElementById<HTMLInputElement>("public-key").value;
      const privateKey = getElementById<HTMLInputElement>("private-key").value;
      const customerId =
        getElementById<HTMLInputElement>("customer-id").value || undefined;

      const clientToken = await getClientToken({
        publicKey,
        privateKey,
        customerId,
      });

      const braintree = getBraintreeSDK();

      const clientInstance = await braintree.client.create({
        authorization: clientToken,
      });

      paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
        client: clientInstance,
      });

      await paypalCheckoutV6Instance.loadPayPalSDK();

      showResult(
        "<strong>Initialized successfully!</strong> Now vault a PayPal account in Step 2.",
        true
      );

      // Show vault section
      getElementById("vault-section").style.display = "block";
    } catch (error) {
      showResult(
        `<strong>Initialization Error:</strong> ${(error as Error).message}`,
        false
      );
    } finally {
      initBtn.disabled = false;
      initBtn.textContent = "Initialize";
    }
  });

  // Vault button handler
  getElementById("vault-btn").addEventListener("click", async () => {
    const vaultBtn = getElementById<HTMLButtonElement>("vault-btn");
    vaultBtn.disabled = true;
    vaultBtn.textContent = "Opening PayPal...";

    try {
      // Create billing agreement session to vault the PayPal account
      const session = paypalCheckoutV6Instance.createBillingAgreementSession({
        billingAgreementDescription: "Vault for future purchases",
        onApprove: async (data: IPayPalV6ApproveData) => {
          try {
            const payload = await paypalCheckoutV6Instance.tokenizePayment({
              billingToken: data.billingToken,
            });

            vaultedNonce = payload.nonce;
            vaultedEmail = payload.details?.email || "Unknown";

            showVaultResult(
              `<strong>PayPal account vaulted!</strong><br>
              <small>Email: ${vaultedEmail}</small><br>
              <small>Nonce: ${payload.nonce.substring(0, 20)}...</small>`,
              true
            );

            // Show checkout section with vaulted account info
            getElementById("checkout-section").style.display = "block";
            getElementById("vaulted-account-info").innerHTML = `
              <strong>Vaulted PayPal Account:</strong><br>
              <small>Email: ${vaultedEmail}</small><br>
              <small>Payer ID: ${payload.details?.payerId || "N/A"}</small>
            `;

            showResult(
              "<strong>Step 2 complete!</strong> You can now start vault-initiated checkout in Step 3.",
              true
            );

            vaultBtn.disabled = false;
            vaultBtn.textContent = "Vault PayPal Account";
          } catch (err) {
            showVaultResult(
              `<strong>Tokenization Error:</strong> ${(err as Error).message}`,
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
          const resultDiv = getElementById("vault-result");
          showDetailedError(resultDiv, "Vault Error", err);
          resultDiv.style.display = "block";
          vaultBtn.disabled = false;
          vaultBtn.textContent = "Vault PayPal Account";
        },
      });

      await session.start();
    } catch (error) {
      showVaultResult(
        `<strong>Vault Error:</strong> ${(error as Error).message}`,
        false
      );
      vaultBtn.disabled = false;
      vaultBtn.textContent = "Vault PayPal Account";
    }
  });

  // Checkout button handler
  getElementById("checkout-btn").addEventListener("click", async () => {
    if (!vaultedNonce) {
      showResult(
        "<strong>Error:</strong> Please vault a PayPal account first in Step 2.",
        false
      );
      return;
    }

    const checkoutBtn = getElementById<HTMLButtonElement>("checkout-btn");
    const amount = getElementById<HTMLInputElement>("amount").value;
    const currency = getElementById<HTMLInputElement>("currency").value;
    const optOutBackdrop =
      getElementById<HTMLInputElement>("opt-out-backdrop").checked;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing...";

    // Enable window control buttons
    const focusBtn = getElementById<HTMLButtonElement>("focus-window-btn");
    const closeBtn = getElementById<HTMLButtonElement>("close-window-btn");
    focusBtn.disabled = false;
    closeBtn.disabled = false;
    focusBtn.style.opacity = "1";
    closeBtn.style.opacity = "1";

    try {
      const payload =
        await paypalCheckoutV6Instance.startVaultInitiatedCheckout({
          vaultInitiatedCheckoutPaymentMethodToken: vaultedNonce,
          amount: amount,
          currency: currency,
          optOutOfModalBackdrop: optOutBackdrop,
        });

      showResult(
        `
        <strong>Vault-Initiated Checkout Successful!</strong><br><br>
        <small><strong>New Nonce:</strong> ${payload.nonce}</small><br>
        <small><strong>Type:</strong> ${payload.type}</small><br>
        <small><strong>Email:</strong> ${payload.details?.email || "N/A"}</small><br>
        <small><strong>Payer ID:</strong> ${payload.details?.payerId || "N/A"}</small><br>
        <small><strong>Name:</strong> ${payload.details?.firstName || ""} ${payload.details?.lastName || ""}</small>
      `,
        true
      );
    } catch (error) {
      const err = error as { code?: string; message?: string };
      const resultDiv = getElementById("result");

      // Provide more context for common error codes
      if (err.code === "PAYPAL_CHECKOUT_V6_VIC_CANCELED") {
        showResult(
          "<strong>Checkout Canceled:</strong> Customer closed the popup.",
          false
        );
      } else if (err.code === "PAYPAL_CHECKOUT_V6_VIC_POPUP_OPEN_FAILED") {
        showResult(
          "<strong>Popup Failed:</strong> Could not open popup. This must be triggered by a user click.",
          false
        );
      } else if (err.code === "PAYPAL_CHECKOUT_V6_VIC_IN_PROGRESS") {
        showResult(
          "<strong>Already In Progress:</strong> Another vault-initiated checkout is already running.",
          false
        );
      } else {
        showDetailedError(resultDiv, "Checkout Error", err as IBraintreeError);
      }
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Start Vault-Initiated Checkout";

      // Disable window control buttons
      focusBtn.disabled = true;
      closeBtn.disabled = true;
      focusBtn.style.opacity = "0.5";
      closeBtn.style.opacity = "0.5";
    }
  });

  // Focus window button handler
  getElementById("focus-window-btn").addEventListener("click", () => {
    paypalCheckoutV6Instance.focusVaultInitiatedCheckoutWindow().catch(() => {
      // Error handling - window may already be closed
    });
  });

  // Close window button handler
  getElementById("close-window-btn").addEventListener("click", () => {
    paypalCheckoutV6Instance
      .closeVaultInitiatedCheckoutWindow()
      .then(() => {
        showResult(
          "<strong>Window Closed:</strong> VIC window was closed by merchant.",
          false
        );
      })
      .catch(() => {
        // Error handling - window may already be closed
      });
  });
};

export const VaultInitiatedCheckout: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createVaultInitiatedCheckoutForm();
      container.appendChild(formContainer);
      setupVaultInitiatedCheckout(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
