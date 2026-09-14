import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import type {
  IBraintreeError,
  IVenmoCreateOptions,
  IVenmoTokenizePayload,
} from "../../types/global";
import venmoLogoUrl from "../../assets/venmo-logo.svg?url";
import "./venmo.css";

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

      <button id="venmo-button" class="venmo-button" type="button" style="display:none">
        <img src="${venmoLogoUrl}" alt="Pay with Venmo" />
      </button>
      <div id="result" class="shared-result"></div>
      <div id="loading" class="shared-loading">Initializing Venmo...</div>
    </div>
  `;

  return container;
};

const setupVenmo = (
  container: HTMLElement,
  venmoOptions: IVenmoCreateOptions
) => {
  const authorization = getAuthorizationToken();
  const venmoButton = container.querySelector(
    "#venmo-button"
  ) as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLDivElement;
  const loadingDiv = container.querySelector("#loading") as HTMLDivElement;

  window
    .braintree!.client.create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      window.__testClient = clientInstance;
      return window.braintree!.venmo.create({
        client: clientInstance,
        riskCorrelationId: "foo-bar-test",
        ...venmoOptions,
      });
    })
    .then((venmoInstance) => {
      window.__venmoInstance = venmoInstance;

      loadingDiv.style.display = "none";
      venmoButton.style.display = "block";

      venmoButton.addEventListener("click", () => {
        venmoButton.disabled = true;
        venmoButton.textContent = "Processing...";

        venmoInstance
          .tokenize()
          .then((payload: IVenmoTokenizePayload) => {
            handleVenmoSuccess(resultDiv, payload);
            venmoButton.disabled = false;
            venmoButton.textContent = "Pay with Venmo";
          })
          .catch((tokenizeError: IBraintreeError) => {
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
  payload: IVenmoTokenizePayload
) => {
  resultDiv.className =
    "shared-result shared-result--success shared-result--visible";
  resultDiv.innerHTML = `
    <strong>Payment method obtained!</strong><br>
    <small>Nonce: ${payload.nonce}</small><br>
    <small>Username: ${payload.details.username}</small>
  `;
};

const handleVenmoError = (
  resultDiv: HTMLDivElement,
  error: IBraintreeError
) => {
  let message = error.message;

  if (error.code === "VENMO_CUSTOMER_CANCELED") {
    message = "Customer canceled the Venmo payment";
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
        totalAmount: "10.00",
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
        "Desktop QR code integration for single-use or multi-use payment methods with enhanced desktop support."
      );
      container.appendChild(formContainer);
      setupVenmo(formContainer, {
        allowDesktop: true,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
        collectCustomerBillingAddress: true,
        collectCustomerShippingAddress: true,
      });
    },
    ["client.min.js", "venmo.min.js"]
  ),
};
