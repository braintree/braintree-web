/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./client.css";
import { IBraintreeClient } from "../../types";

const meta: Meta = {
  title: "Braintree/Client",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
The Client component is the foundation of the Braintree JS SDK. Every other component depends
on it for authorization, configuration, and communication with the Braintree gateway.

This story demonstrates client creation, configuration inspection, version reporting, and teardown.
        `,
      },
    },
  },
};

export default meta;

const createClientForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Client</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          The Braintree Client handles authorization and gateway communication.
          Click "Create Client" to initialize, then inspect the configuration
          and SDK version.
        </p>
      </div>

      <div class="shared-spacing-bottom button-group">
        <button id="create-client-button" class="shared-button">Create Client</button>
        <button id="teardown-button" class="shared-button" disabled>Teardown</button>
      </div>

      <div class="client-info-grid">
        <div class="client-info-item">
          <strong>Authorization Type</strong>
          <span id="auth-type">--</span>
        </div>
        <div class="client-info-item">
          <strong>SDK Version</strong>
          <span id="sdk-version">--</span>
        </div>
      </div>

      <div id="teardown-status" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="config-display" class="client-config-display" style="display: none;">
        <pre></pre>
      </div>
    </div>
  `;

  return container;
};

const initializeClient = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const createButton = container.querySelector(
    "#create-client-button"
  ) as HTMLButtonElement;
  const teardownButton = container.querySelector(
    "#teardown-button"
  ) as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const configDisplay = container.querySelector(
    "#config-display"
  ) as HTMLElement;
  const authTypeSpan = container.querySelector("#auth-type") as HTMLElement;
  const sdkVersionSpan = container.querySelector("#sdk-version") as HTMLElement;
  const teardownStatus = container.querySelector(
    "#teardown-status"
  ) as HTMLElement;

  let clientInstance!: IBraintreeClient;

  const showError = (message: string) => {
    resultDiv.style.display = "block";
    resultDiv.className =
      "shared-result shared-result--error shared-result--visible";
    resultDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  };

  const showSuccess = (message: string) => {
    resultDiv.style.display = "block";
    resultDiv.className =
      "shared-result shared-result--success shared-result--visible";
    resultDiv.innerHTML = `<strong>Success!</strong> ${message}`;
  };

  createButton.addEventListener("click", () => {
    createButton.disabled = true;
    resultDiv.style.display = "none";
    resultDiv.className = "shared-result";
    teardownStatus.style.display = "none";

    window
      .braintree!.client.create({ authorization })
      .then((instance) => {
        clientInstance = instance;
        teardownButton.disabled = false;

        const config = instance.getConfiguration();
        console.log("Client configuration:", config);
        const authType = config.authorizationType;
        const version = instance.getVersion();

        authTypeSpan.textContent = authType;
        sdkVersionSpan.textContent = version;

        const displayConfig = {
          authorizationType: authType,
          environment: config.gatewayConfiguration.environment,
          analyticsMetadata: config.analyticsMetadata,
          gatewayUrl: config.gatewayConfiguration.clientApiUrl,
          assetsUrl: config.gatewayConfiguration.assetsUrl,
        };

        configDisplay.style.display = "block";
        const pre = configDisplay.querySelector("pre") as HTMLElement;
        pre.textContent = JSON.stringify(displayConfig, null, 2);

        showSuccess("Client created successfully.");
        console.log("Client instance created:", instance);
      })
      .catch((err: Error) => {
        createButton.disabled = false;
        console.error("Client creation error:", err);
        showError(err.message);
      });
  });

  teardownButton.addEventListener("click", () => {
    teardownButton.disabled = true;

    clientInstance
      .teardown()
      .then(() => {
        createButton.disabled = false;
        authTypeSpan.textContent = "--";
        sdkVersionSpan.textContent = "--";
        configDisplay.style.display = "none";
        resultDiv.style.display = "none";
        resultDiv.className = "shared-result";

        teardownStatus.style.display = "block";
        teardownStatus.className =
          "shared-result shared-result--success shared-result--visible";
        teardownStatus.innerHTML =
          "<strong>Teardown complete.</strong> Client instance has been destroyed.";
        console.log("Client teardown complete");
      })
      .catch((err: Error) => {
        teardownButton.disabled = false;
        teardownStatus.style.display = "block";
        teardownStatus.className =
          "shared-result shared-result--error shared-result--visible";
        teardownStatus.innerHTML = `<strong>Teardown error:</strong> ${err.message}`;
        console.error("Client teardown error:", err);
      });
  });
};

export const ClientInitialization: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createClientForm();
      container.appendChild(formContainer);
      initializeClient(formContainer);
    },
    ["client.min.js"]
  ),
};
