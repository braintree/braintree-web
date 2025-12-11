/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import "./vaultManager.css";

const meta: Meta = {
  title: "Braintree/Vault Manager",
  parameters: {
    layout: "centered",
    braintreeScripts: ["vault-manager", "data-collector"],
    docs: {
      description: {
        component: `
Vault Manager allows you to manage a customer's payment methods on the client.
        `,
      },
    },
  },
};

export default meta;

type CreateClientTokenResponse = {
  data: {
    createClientToken: {
      clientToken: string;
    };
  };
};

interface PaymentMethod {
  fundingSourceDescription?: string;
  default: boolean;
  type?: string;
  details?: {
    editPayPalVaultId?: string;
  };
}

interface UpdatePayload {
  approvalUrl?: string;
}

interface IVaultManager {
  fetchPaymentMethods: (_options?: {
    type?: string;
  }) => Promise<PaymentMethod[]>;
  updatePaymentMethod: (_options: {
    default: {
      editPayPalVaultId: string;
      returnUrl: string;
      cancelUrl: string;
    };
  }) => Promise<UpdatePayload>;
}

interface IBraintreeClient {
  [key: string]: unknown;
}

declare global {
  interface Window {
    braintree: {
      client: {
        create: (_options: {
          authorization: string;
        }) => Promise<IBraintreeClient>;
      };
      vaultManager: {
        create: (_options: {
          client: IBraintreeClient;
        }) => Promise<IVaultManager>;
      };
    };
  }
}

const createVaultManagerForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="vault-manager-container">
      <h2>Braintree Vault Manager</h2>

      <div class="vault-description">
        <p>
          Vault Manager allows customers to view, edit, and manage their saved payment methods.
          This demo uses real API calls to demonstrate the functionality.
        </p>
      </div>

      <!-- Credentials Section -->
      <div class="credentials-section">
        <h3>Merchant Credentials</h3>
        <div class="form-grid">
          <div>
            <label class="shared-label">Public Key</label>
            <input type="text" id="public-key" class="shared-input" placeholder="Enter your public key" />
            <div id="help-public-key" class="help-text"></div>
          </div>
          <div>
            <label class="shared-label">Private Key</label>
            <input type="password" id="private-key" class="shared-input" placeholder="Enter your private key" />
            <div id="help-private-key" class="help-text"></div>
          </div>
        </div>
        <div class="shared-form-group-alt">
          <label for="custId">Customer ID</label>
          <input type="text" id="custId" value="demo_customer_123" placeholder="Enter customer ID" />
        </div>
        <button id="initialize-vault" type="button" class="btn btn-secondary">Initialize Vault Manager</button>
      </div>

      <!-- Vault Manager Actions -->
      <div class="actions-section">
        <button type="button" id="fetch-all" class="btn btn-secondary after-create" disabled>
          Fetch All Payment Methods
        </button>

        <button type="button" id="vault-update" class="btn btn-warning after-fetch" disabled>
          Update Payment Method
        </button>
      </div>

      <!-- Results Display -->
      <div class="results-section">
        <div id="formError" class="shared-result-display error-display"></div>
        <div id="vault-create-display" class="shared-result-display"></div>
        <div id="vault-fetch-all-display" class="shared-result-display"></div>
        <div id="vault-update-display" class="shared-result-display"></div>
      </div>
    </div>
  `;

  return container;
};

const setupVaultManager = (container: HTMLElement): void => {
  let _customerId: string;
  let _vaultManagerInstance: IVaultManager;
  let _editId: string;

  // Helper function to get element by ID with proper typing
  const getElementById = <T extends HTMLElement = HTMLElement>(
    id: string
  ): T => {
    return container.querySelector(`#${id}`) as T;
  };

  // Helper function to get elements by class with proper typing
  const getElementsByClass = (className: string): HTMLElement[] => {
    return Array.from(
      container.getElementsByClassName(className)
    ) as HTMLElement[];
  };

  // Helper function to show result display with content
  const showResultDisplay = (id: string, content: string): void => {
    const element = getElementById(id);
    element.innerHTML = content;
    element.style.display = "block";
  };

  // Helper function to hide result display
  const hideResultDisplay = (id: string): void => {
    const element = getElementById(id);
    element.innerHTML = "";
    element.style.display = "none";
  };

  // Helper function to clear all result displays
  const clearAllResults = (): void => {
    hideResultDisplay("formError");
    hideResultDisplay("vault-create-display");
    hideResultDisplay("vault-fetch-all-display");
    hideResultDisplay("vault-update-display");
  };

  const getClientToken = async (): Promise<string> => {
    let clientToken = "";

    const pubKey = getElementById<HTMLInputElement>("public-key").value;
    const privKey = getElementById<HTMLInputElement>("private-key").value;

    _customerId = getElementById<HTMLInputElement>("custId").value;

    try {
      const gqlAuthorization = window.btoa(`${pubKey}:${privKey}`);
      const responseBody = `{"query": "mutation CreateClientToken($input: CreateClientTokenInput!) { createClientToken(input: $input) { clientToken } }","variables": {"input": {"clientToken": {"customerId": "${_customerId}"}}}}`;

      const response = await fetch(
        "https://payments.sandbox.braintree-api.com/graphql",
        {
          method: "POST",
          headers: {
            Authorization: gqlAuthorization,
            "Braintree-version": "2023-07-03",
            "Content-Type": "application/json",
          },
          body: responseBody,
        }
      );

      const clientTokenResponse: CreateClientTokenResponse =
        await response.json();
      clientToken = clientTokenResponse.data.createClientToken.clientToken;
    } catch (error) {
      showResultDisplay(
        "formError",
        `<p class="error-text">Error creating client token: ${error as string}</p>`
      );
      console.log("Client Token error", error);
    }

    return clientToken;
  };

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
      getElementById<HTMLInputElement>(
        "public-key"
      ).parentElement?.classList.add("has-error");
    } else {
      publicKeyHelp.textContent = "";
      getElementById<HTMLInputElement>(
        "public-key"
      ).parentElement?.classList.remove("has-error");
    }

    if (!privateKey) {
      isValid = false;
      privateKeyHelp.textContent = "Private key is required.";
      getElementById<HTMLInputElement>(
        "private-key"
      ).parentElement?.classList.add("has-error");
    } else {
      privateKeyHelp.textContent = "";
      getElementById<HTMLInputElement>(
        "private-key"
      ).parentElement?.classList.remove("has-error");
    }

    return isValid;
  };

  async function initializeConnect(): Promise<{
    vaultManagerInstance: IVaultManager;
    clientInstance: IBraintreeClient;
  }> {
    let vaultManagerInstance!: IVaultManager;
    let clientInstance!: IBraintreeClient;

    try {
      const clientToken = await getClientToken();

      clientInstance = await window.braintree.client.create({
        authorization: clientToken,
      });

      vaultManagerInstance = (await window.braintree.vaultManager.create({
        client: clientInstance,
      })) as unknown as IVaultManager;
    } catch (error) {
      showResultDisplay(
        "vault-create-display",
        `<p class="error-text">Error creating Vault Manager: ${error as string}</p>`
      );
      console.log("Creating client error:", error);
    }

    return { vaultManagerInstance, clientInstance };
  }

  // Event listeners
  getElementById("initialize-vault").addEventListener("click", async () => {
    if (!validateCredentials()) {
      return;
    }

    const initializeButton =
      getElementById<HTMLButtonElement>("initialize-vault");
    initializeButton.disabled = true;
    initializeButton.textContent = "Initializing...";

    try {
      clearAllResults(); // Clear previous results

      const res = await initializeConnect();
      console.log("Vault Manager created successfully:", res);
      _vaultManagerInstance =
        res.vaultManagerInstance as unknown as IVaultManager;

      if (res.clientInstance) {
        showResultDisplay(
          "vault-create-display",
          `<p class="shared-success-text">Vault Manager Created for Customer: ${_customerId}</p>`
        );

        const elements = getElementsByClass("after-create");
        elements.forEach((element) => {
          (element as HTMLButtonElement).disabled = false;
        });
      }
    } catch (error) {
      console.error(error);
      showResultDisplay(
        "vault-create-display",
        `<p class="shared-error-text">Failed to create Vault Manager: ${error.message || error}</p>`
      );
    } finally {
      initializeButton.disabled = false;
      initializeButton.textContent = "Initialize Vault Manager";
    }
  });

  getElementById("fetch-all").addEventListener("click", () => {
    hideResultDisplay("vault-fetch-all-display"); // Clear previous results

    _vaultManagerInstance
      .fetchPaymentMethods({ type: "paypal" })
      .then((paymentMethods) => {
        console.log("Payment methods fetched:", paymentMethods);

        if (paymentMethods.length === 0) {
          showResultDisplay(
            "vault-fetch-all-display",
            '<p class="info-text">No payment methods found for this customer.</p>'
          );
          return;
        }

        let displayContent = "";
        paymentMethods.forEach((paymentMethod) => {
          _editId = paymentMethod?.details?.editPayPalVaultId;

          const paymentMethodDisplay = `
            <div class="payment-method-card">
              <div class="payment-method-info">
                <strong>Description:</strong> ${paymentMethod.fundingSourceDescription || "N/A"}<br>
                <strong>Default:</strong> ${paymentMethod.default ? "Yes" : "No"}<br>
                <strong>Type:</strong> ${paymentMethod.type || "N/A"}
              </div>
            </div>
          `;

          displayContent += paymentMethodDisplay;
        });

        showResultDisplay("vault-fetch-all-display", displayContent);

        const elements = getElementsByClass("after-fetch");
        elements.forEach((element) => {
          (element as HTMLButtonElement).disabled = false;
        });
      })
      .catch((error) => {
        console.error(error);
        showResultDisplay(
          "vault-fetch-all-display",
          `<p class="error-text">Failed to fetch payment methods: ${error.message || error}</p>`
        );
      });
  });

  getElementById("vault-update").addEventListener("click", () => {
    console.log("Updating payment method with editId:", _editId);

    if (!_editId) {
      showResultDisplay(
        "vault-update-display",
        '<p class="error-text">No payment method selected for update. Please fetch payment methods first.</p>'
      );
      return;
    }

    hideResultDisplay("vault-update-display"); // Clear previous results

    const updateOptions = {
      editPayPalVaultId: _editId,
      returnUrl:
        "https://example.com/pwpp/hermes-spike/html/redirect-frame.html",
      cancelUrl:
        "https://example.com/pwpp/hermes-spike/html/redirect-frame.html",
    };

    _vaultManagerInstance
      .updatePaymentMethod({ default: updateOptions })
      .then((updatePayload) => {
        console.log("Update completed:", updatePayload);

        const updateDisplay = `
          <div class="update-result">
            <p class="success-text">Payment method update initiated successfully!</p>
            ${updatePayload?.approvalUrl ? `<p><strong>Approval URL:</strong> <a href="${updatePayload.approvalUrl}" target="_blank">${updatePayload.approvalUrl}</a></p>` : ""}
          </div>
        `;

        showResultDisplay("vault-update-display", updateDisplay);
      })
      .catch((error) => {
        console.error(error);
        showResultDisplay(
          "vault-update-display",
          `<p class="error-text">Failed to update payment method: ${error.message || error}</p>`
        );
      });
  });
};

export const VaultManager: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createVaultManagerForm();
      container.appendChild(formContainer);
      setupVaultManager(formContainer);
    },
    ["client.min.js", "vault-manager.min.js", "data-collector.min.js"]
  ),
};
