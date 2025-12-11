import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./venmo.css";

// cSpell:ignore venmo Venmo

// Type assertion for window.braintree to include venmo
interface BraintreeWithVenmo {
  client: {
    create: (_options: { authorization: string }) => Promise<unknown>;
  };
  venmo: {
    create: (_options: {
      client: unknown;
      allowDesktop?: boolean;
      allowDesktopWebLogin?: boolean;
      mobileWebFallBack?: boolean;
      paymentMethodUsage?: "single_use" | "multi_use";
      [key: string]: unknown;
    }) => Promise<{
      isBrowserSupported(): boolean;
      hasTokenizationResult(): boolean;
      tokenize(): Promise<{
        nonce: string;
        details: { username: string };
      }>;
      cancelTokenization(): Promise<void>;
      teardown(): Promise<void>;
    }>;
  };
}
interface VenmoOptions {
  allowDesktop?: boolean;
  allowDesktopWebLogin?: boolean;
  mobileWebFallBack?: boolean;
  paymentMethodUsage?: "single_use" | "multi_use";
  [key: string]: unknown;
}

interface VenmoPayload {
  nonce: string;
  details: {
    username: string;
  };
}

interface VenmoError {
  message: string;
  code?: string;
}

const meta: Meta = {
  title: "Braintree/Venmo",
  parameters: {
    layout: "centered",
    braintreeScripts: ["venmo"],
    docs: {
      description: {
        component: `
Venmo Desktop provides a seamless way for users to pay with Venmo on desktop devices through QR code scanning.
The component displays a modal with a QR code that users can scan with their mobile Venmo app.
        `,
      },
    },
  },
};

export default meta;

const createVenmoForm = (title: string, description: string): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>${title}</h2>

      <div class="venmo-description-wrapper">
        <p class="shared-description">
          ${description}
        </p>
      </div>

      <img id="venmo-button" class="venmo-button" src=".storybook/assets/venmo-logo.svg" />
      <div id="result" class="shared-result"></div>
      <div id="loading" class="shared-loading">Initializing Venmo...</div>
    </div>
  `;

  return container;
};

const setupVenmo = (container: HTMLElement, venmoOptions: VenmoOptions) => {
  const authorization = getAuthorizationToken();
  const venmoButton = container.querySelector(
    "#venmo-button"
  ) as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLDivElement;
  const loadingDiv = container.querySelector("#loading") as HTMLDivElement;

  (window.braintree as unknown as BraintreeWithVenmo).client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return (window.braintree as unknown as BraintreeWithVenmo).venmo.create({
        client: clientInstance,
        ...venmoOptions,
      });
    })
    .then((venmoInstance) => {
      if (!venmoInstance.isBrowserSupported()) {
        showError(resultDiv, loadingDiv, "Browser does not support Venmo");
        return;
      }

      loadingDiv.style.display = "none";
      venmoButton.style.display = "block";

      // Check for existing tokenization results
      if (venmoInstance.hasTokenizationResult()) {
        venmoInstance
          .tokenize()
          .then((payload: VenmoPayload) => {
            handleVenmoSuccess(resultDiv, payload);
          })
          .catch((tokenizeError: VenmoError) => {
            handleVenmoError(resultDiv, tokenizeError);
          });
        return;
      }

      venmoButton.addEventListener("click", () => {
        venmoButton.disabled = true;
        venmoButton.textContent = "Processing...";

        venmoInstance
          .tokenize()
          .then((payload: VenmoPayload) => {
            handleVenmoSuccess(resultDiv, payload);
            venmoButton.disabled = false;
            venmoButton.textContent = "Pay with Venmo";
          })
          .catch((tokenizeError: VenmoError) => {
            handleVenmoError(resultDiv, tokenizeError);
            venmoButton.disabled = false;
            venmoButton.textContent = "Pay with Venmo";
          });
      });
    })
    .catch(() => {
      showError(resultDiv, loadingDiv, "Failed to initialize Venmo");
    });
};

const showError = (
  resultDiv: HTMLDivElement,
  loadingDiv: HTMLDivElement,
  message: string
) => {
  loadingDiv.style.display = "none";
  resultDiv.className =
    "shared-result shared-result--error shared-result--visible";
  resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
};

const handleVenmoSuccess = (
  resultDiv: HTMLDivElement,
  payload: VenmoPayload
) => {
  resultDiv.className =
    "shared-result shared-result--success shared-result--visible";
  resultDiv.innerHTML = `
    <strong>Payment method obtained!</strong><br>
    <small>Nonce: ${payload.nonce}</small><br>
    <small>Username: ${payload.details.username}</small>
  `;
};

const handleVenmoError = (resultDiv: HTMLDivElement, error: VenmoError) => {
  let message = error.message;

  if (error.code === "VENMO_CANCELED") {
    message = "Venmo app not available or user canceled";
  } else if (error.code === "VENMO_APP_CANCELED") {
    message = "User canceled payment in Venmo app";
  }

  resultDiv.className =
    "shared-result shared-result--error shared-result--visible";
  resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
};

export const DesktopWeb: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createVenmoForm(
        "Venmo Desktop Web",
        "Desktop web integration allows users to authenticate via Venmo in a popup window."
      );
      container.appendChild(formContainer);
      setupVenmo(formContainer, {
        mobileWebFallBack: true,
        allowDesktopWebLogin: true,
        paymentMethodUsage: "single_use",
      });
    },
    ["client.min.js", "venmo.min.js"]
  ),
};

export const DesktopQR: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createVenmoForm(
        "Venmo Desktop QR",
        "Desktop QR code integration for multi-use payment methods with enhanced desktop support."
      );
      container.appendChild(formContainer);
      setupVenmo(formContainer, {
        allowDesktop: true,
        paymentMethodUsage: "multi_use",
      });
    },
    ["client.min.js", "venmo.min.js"]
  ),
};
