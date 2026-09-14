/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import type {
  IAmericanExpressInstance,
  IAmexRewardsBalancePayload,
  IAmexExpressCheckoutProfilePayload,
} from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./americanExpress.css";

const meta: Meta = {
  title: "Braintree/American Express",
  parameters: {
    layout: "centered",
    braintreeScripts: ["american-express"],
    docs: {
      description: {
        component: `
The American Express component provides Amex-specific features including
rewards balance lookups and Express Checkout profile retrieval.

**Key Features:**
- Check Membership Rewards balance for tokenized Amex cards
- Retrieve Express Checkout profiles for Amex nonces
- Integrates with Hosted Fields for card tokenization

**Note:** These features require a valid Amex card nonce. In this demo,
you can use a mock nonce to see the API response structure.
        `,
      },
    },
  },
};

export default meta;

// =============================================================================
// Shared Helpers
// =============================================================================

const createAmexStatusIndicator = (
  container: HTMLElement,
  status: "loading" | "ready" | "error",
  message: string
): void => {
  const statusDiv = container.querySelector("#amex-status") as HTMLElement;
  if (!statusDiv) return;

  statusDiv.className = "amex-status";
  if (status === "ready") {
    statusDiv.classList.add("amex-status--ready");
  } else if (status === "error") {
    statusDiv.classList.add("amex-status--error");
  }

  const indicatorClass =
    status === "ready"
      ? "amex-status-indicator amex-status-indicator--ready"
      : "amex-status-indicator";

  statusDiv.textContent = "";
  const span = document.createElement("span");
  span.className = indicatorClass;
  statusDiv.appendChild(span);
  statusDiv.appendChild(document.createTextNode(message));
  statusDiv.style.display = "block";
};

const showAmexResult = (
  container: HTMLElement,
  success: boolean,
  message: string,
  details?: string
): void => {
  const resultDiv = container.querySelector("#result") as HTMLElement;
  if (!resultDiv) return;

  resultDiv.className = success
    ? "shared-result shared-result--success shared-result--visible"
    : "shared-result shared-result--error shared-result--visible";

  resultDiv.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = success ? "Success!" : "Error:";
  resultDiv.appendChild(strong);
  resultDiv.appendChild(document.createTextNode(" " + message));
  if (details) {
    resultDiv.appendChild(document.createElement("br"));
    const small = document.createElement("small");
    small.textContent = details;
    resultDiv.appendChild(small);
  }
};

const displayResponseData = (container: HTMLElement, data: unknown): void => {
  const dataDiv = container.querySelector("#response-data") as HTMLElement;
  if (!dataDiv) return;

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  dataDiv.textContent = "";
  dataDiv.appendChild(pre);
  dataDiv.style.display = "block";
};

// =============================================================================
// Story: Rewards Balance
// =============================================================================

const createRewardsBalanceForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Rewards Balance</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Check the Membership Rewards balance for a tokenized American Express card.
          Enter a payment method nonce from a tokenized Amex card to retrieve the
          rewards balance information.
        </p>
      </div>

      <div class="amex-info">
        <strong>How it works:</strong>
        <ul>
          <li>Tokenize an Amex card using Hosted Fields or another method</li>
          <li>Pass the resulting nonce to getRewardsBalance()</li>
          <li>Receive rewards amount, unit type, and currency equivalent</li>
          <li>Display rewards information to the customer</li>
        </ul>
      </div>

      <div id="amex-status" class="amex-status" style="display: none;"></div>

      <div class="amex-config-panel">
        <h3>Configuration</h3>
        <div class="shared-form-group">
          <label class="shared-label" for="nonce-input">Payment Method Nonce</label>
          <input type="text" id="nonce-input" value="fake-valid-amex-nonce" class="shared-input"
            placeholder="Enter nonce from tokenized Amex card" />
        </div>
      </div>

      <div class="shared-spacing-bottom">
        <button id="check-balance-btn" class="shared-button" disabled>Check Rewards Balance</button>
      </div>

      <div id="response-data" class="amex-response-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Initializing American Express...</div>

      <div class="shared-spacing-bottom" style="margin-top: 15px;">
        <button id="teardown-btn" class="shared-button" disabled>Teardown</button>
      </div>
    </div>
  `;

  return container;
};

const initializeRewardsBalance = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const checkBalanceBtn = container.querySelector(
    "#check-balance-btn"
  ) as HTMLButtonElement;
  const teardownBtn = container.querySelector(
    "#teardown-btn"
  ) as HTMLButtonElement;
  const nonceInput = container.querySelector(
    "#nonce-input"
  ) as HTMLInputElement;

  let amexInstance: IAmericanExpressInstance | null = null;

  createAmexStatusIndicator(container, "loading", "Initializing...");

  window
    .braintree!.client.create({ authorization })
    .then(function (clientInstance) {
      return window.braintree!.americanExpress.create({
        client: clientInstance,
      });
    })
    .then(function (instance) {
      amexInstance = instance;
      loadingDiv.style.display = "none";
      checkBalanceBtn.disabled = false;
      teardownBtn.disabled = false;

      createAmexStatusIndicator(container, "ready", "American Express Ready");
      showAmexResult(
        container,
        true,
        "American Express component initialized successfully"
      );
    })
    .catch(function (err) {
      console.error("American Express error:", err);
      loadingDiv.style.display = "none";
      createAmexStatusIndicator(
        container,
        "error",
        "Failed to initialize: " + err.message
      );
      showAmexResult(container, false, err.message);
    });

  checkBalanceBtn.addEventListener("click", function () {
    if (!amexInstance) return;

    const nonce = nonceInput.value.trim();
    if (!nonce) {
      showAmexResult(container, false, "Please enter a nonce");
      return;
    }

    checkBalanceBtn.disabled = true;
    createAmexStatusIndicator(
      container,
      "loading",
      "Checking rewards balance..."
    );

    amexInstance
      .getRewardsBalance({ nonce: nonce })
      .then(function (payload: IAmexRewardsBalancePayload) {
        checkBalanceBtn.disabled = false;

        if (payload.error) {
          createAmexStatusIndicator(
            container,
            "error",
            "Amex Error: " + payload.error.message
          );
          showAmexResult(
            container,
            false,
            payload.error.message,
            "Error code: " + payload.error.code
          );
        } else {
          createAmexStatusIndicator(container, "ready", "Balance retrieved");
          showAmexResult(
            container,
            true,
            "Rewards balance retrieved",
            "Amount: " +
              (payload.rewardsAmount || "N/A") +
              " " +
              (payload.rewardsUnit || "")
          );
        }

        displayResponseData(container, payload);
      })
      .catch(function (err) {
        checkBalanceBtn.disabled = false;
        console.error("Rewards balance error:", err);
        createAmexStatusIndicator(container, "error", "Error: " + err.message);
        showAmexResult(
          container,
          false,
          err.message,
          "Error code: " + (err.code || "N/A")
        );
      });
  });

  teardownBtn.addEventListener("click", function () {
    if (!amexInstance) return;

    amexInstance.teardown().then(function () {
      amexInstance = null;
      checkBalanceBtn.disabled = true;
      teardownBtn.disabled = true;
      createAmexStatusIndicator(container, "loading", "Torn down");
      showAmexResult(
        container,
        true,
        "American Express torn down successfully"
      );
    });
  });
};

export const RewardsBalance: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createRewardsBalanceForm();
      container.appendChild(formContainer);
      initializeRewardsBalance(formContainer);
    },
    ["client.min.js", "american-express.min.js"]
  ),
};

// =============================================================================
// Story: Express Checkout Profile
// =============================================================================

const createExpressCheckoutForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Express Checkout Profile</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Retrieve an Express Checkout profile for an American Express nonce.
          This returns card details including card type, last two digits, expiration,
          and BIN information.
        </p>
      </div>

      <div class="amex-info">
        <strong>How it works:</strong>
        <ul>
          <li>Obtain an American Express nonce from Express Checkout</li>
          <li>Pass the nonce to getExpressCheckoutProfile()</li>
          <li>Receive card details and a Braintree payment method nonce</li>
          <li>Use the Braintree nonce for server-side transactions</li>
        </ul>
      </div>

      <div id="amex-status" class="amex-status" style="display: none;"></div>

      <div class="amex-config-panel">
        <h3>Configuration</h3>
        <div class="shared-form-group">
          <label class="shared-label" for="amex-nonce-input">American Express Nonce</label>
          <input type="text" id="amex-nonce-input" value="fake-amex-express-checkout-nonce" class="shared-input"
            placeholder="Enter Amex Express Checkout nonce" />
        </div>
      </div>

      <div class="shared-spacing-bottom">
        <button id="get-profile-btn" class="shared-button" disabled>Get Express Checkout Profile</button>
      </div>

      <div id="response-data" class="amex-response-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Initializing American Express...</div>
    </div>
  `;

  return container;
};

const initializeExpressCheckout = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const getProfileBtn = container.querySelector(
    "#get-profile-btn"
  ) as HTMLButtonElement;
  const nonceInput = container.querySelector(
    "#amex-nonce-input"
  ) as HTMLInputElement;

  let amexInstance: IAmericanExpressInstance | null = null;

  createAmexStatusIndicator(container, "loading", "Initializing...");

  window
    .braintree!.client.create({ authorization })
    .then(function (clientInstance) {
      return window.braintree!.americanExpress.create({
        client: clientInstance,
      });
    })
    .then(function (instance) {
      amexInstance = instance;
      loadingDiv.style.display = "none";
      getProfileBtn.disabled = false;

      createAmexStatusIndicator(container, "ready", "American Express Ready");
      showAmexResult(
        container,
        true,
        "American Express component initialized successfully"
      );
    })
    .catch(function (err) {
      console.error("American Express error:", err);
      loadingDiv.style.display = "none";
      createAmexStatusIndicator(
        container,
        "error",
        "Failed to initialize: " + err.message
      );
      showAmexResult(container, false, err.message);
    });

  getProfileBtn.addEventListener("click", function () {
    if (!amexInstance) return;

    const nonce = nonceInput.value.trim();
    if (!nonce) {
      showAmexResult(container, false, "Please enter a nonce");
      return;
    }

    getProfileBtn.disabled = true;
    createAmexStatusIndicator(container, "loading", "Retrieving profile...");

    amexInstance
      .getExpressCheckoutProfile({ nonce: nonce })
      .then(function (payload: IAmexExpressCheckoutProfilePayload) {
        getProfileBtn.disabled = false;

        const cardCount = payload.amexExpressCheckoutCards
          ? payload.amexExpressCheckoutCards.length
          : 0;

        createAmexStatusIndicator(container, "ready", "Profile retrieved");
        showAmexResult(
          container,
          true,
          "Express Checkout profile retrieved",
          "Cards found: " + cardCount
        );

        displayResponseData(container, payload);
      })
      .catch(function (err) {
        getProfileBtn.disabled = false;
        console.error("Express Checkout profile error:", err);
        createAmexStatusIndicator(container, "error", "Error: " + err.message);
        showAmexResult(
          container,
          false,
          err.message,
          "Error code: " + (err.code || "N/A")
        );
      });
  });
};

export const ExpressCheckoutProfile: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createExpressCheckoutForm();
      container.appendChild(formContainer);
      initializeExpressCheckout(formContainer);
    },
    ["client.min.js", "american-express.min.js"]
  ),
};

// =============================================================================
// Story: Error Handling
// =============================================================================

const createErrorHandlingForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Error Handling</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Demonstrates how the American Express component handles various error
          scenarios including missing nonces, invalid configurations, and
          network errors.
        </p>
      </div>

      <div class="amex-config-panel">
        <h3>Error Scenarios</h3>
        <div class="shared-form-group">
          <label class="shared-label">
            <input type="radio" name="error-scenario" id="scenario-missing-nonce" value="missing-nonce" checked>
            Missing Nonce - Rewards Balance (AMEX_NONCE_REQUIRED)
          </label>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">
            <input type="radio" name="error-scenario" id="scenario-missing-nonce-checkout" value="missing-nonce-checkout">
            Missing Nonce - Express Checkout (AMEX_NONCE_REQUIRED)
          </label>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">
            <input type="radio" name="error-scenario" id="scenario-invalid-auth" value="invalid-auth">
            Invalid Authorization
          </label>
        </div>
        <div class="shared-form-group">
          <label class="shared-label">
            <input type="radio" name="error-scenario" id="scenario-valid" value="valid">
            Valid Configuration (for comparison)
          </label>
        </div>
      </div>

      <div id="amex-status" class="amex-status" style="display: none;"></div>

      <div class="shared-spacing-bottom">
        <button id="test-btn" class="shared-button">Test Scenario</button>
      </div>

      <div id="response-data" class="amex-response-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading" style="display: none;"></div>
    </div>
  `;

  return container;
};

const initializeErrorHandling = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const testBtn = container.querySelector("#test-btn") as HTMLButtonElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;

  testBtn.addEventListener("click", function () {
    const selectedScenario = (
      container.querySelector(
        'input[name="error-scenario"]:checked'
      ) as HTMLInputElement
    ).value;

    testBtn.disabled = true;
    loadingDiv.style.display = "block";
    loadingDiv.textContent = "Testing scenario...";
    createAmexStatusIndicator(container, "loading", "Testing...");

    const authToUse =
      selectedScenario === "invalid-auth"
        ? "invalid_tokenization_key"
        : authorization;

    window
      .braintree!.client.create({ authorization: authToUse })
      .then(function (clientInstance) {
        return window.braintree!.americanExpress.create({
          client: clientInstance,
        });
      })
      .then(function (instance) {
        if (selectedScenario === "missing-nonce") {
          // Call getRewardsBalance without a nonce to trigger AMEX_NONCE_REQUIRED
          return instance
            .getRewardsBalance({ nonce: "" })
            .then(function (payload) {
              loadingDiv.style.display = "none";
              testBtn.disabled = false;
              createAmexStatusIndicator(container, "ready", "Success");
              showAmexResult(container, true, "Rewards balance retrieved");
              displayResponseData(container, payload);
              return instance.teardown();
            });
        }

        if (selectedScenario === "missing-nonce-checkout") {
          // Call getExpressCheckoutProfile without a nonce to trigger AMEX_NONCE_REQUIRED
          return instance
            .getExpressCheckoutProfile({ nonce: "" })
            .then(function (payload) {
              loadingDiv.style.display = "none";
              testBtn.disabled = false;
              createAmexStatusIndicator(container, "ready", "Success");
              showAmexResult(
                container,
                true,
                "Express Checkout profile retrieved"
              );
              displayResponseData(container, payload);
              return instance.teardown();
            });
        }

        // Valid scenario
        loadingDiv.style.display = "none";
        testBtn.disabled = false;
        createAmexStatusIndicator(container, "ready", "Success");
        showAmexResult(
          container,
          true,
          "American Express component created successfully"
        );

        return instance.teardown();
      })
      .catch(function (err) {
        loadingDiv.style.display = "none";
        testBtn.disabled = false;

        createAmexStatusIndicator(container, "error", "Error: " + err.message);
        showAmexResult(
          container,
          false,
          err.message,
          "Error code: " + (err.code || "N/A")
        );
      });
  });
};

export const ErrorHandling: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createErrorHandlingForm();
      container.appendChild(formContainer);
      initializeErrorHandling(formContainer);
    },
    ["client.min.js", "american-express.min.js"]
  ),
};

// =============================================================================
// Story: Component Lifecycle
// =============================================================================

const createLifecycleForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Component Lifecycle</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Demonstrates the full lifecycle of the American Express component:
          initialization, API calls, teardown, and re-initialization.
        </p>
      </div>

      <div id="amex-status" class="amex-status" style="display: none;"></div>

      <div id="lifecycle-log" class="amex-response-data" style="display: block; min-height: 100px;">
        <em>Lifecycle events will appear here...</em>
      </div>

      <div class="shared-spacing-bottom" style="margin-top: 15px;">
        <button id="init-btn" class="shared-button">1. Initialize</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="rewards-btn" class="shared-button" disabled>2. Get Rewards Balance</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="teardown-btn" class="shared-button" disabled>3. Teardown</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="reinit-btn" class="shared-button" disabled>4. Re-initialize</button>
      </div>

      <div id="response-data" class="amex-response-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const initializeLifecycle = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const initBtn = container.querySelector("#init-btn") as HTMLButtonElement;
  const rewardsBtn = container.querySelector(
    "#rewards-btn"
  ) as HTMLButtonElement;
  const teardownBtn = container.querySelector(
    "#teardown-btn"
  ) as HTMLButtonElement;
  const reinitBtn = container.querySelector("#reinit-btn") as HTMLButtonElement;
  const logDiv = container.querySelector("#lifecycle-log") as HTMLElement;

  let amexInstance: IAmericanExpressInstance | null = null;
  let initCount = 0;

  const logEvent = (event: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.textContent = "[" + timestamp + "] " + event;
    if (logDiv.querySelector("em")) {
      logDiv.textContent = "";
    }
    logDiv.appendChild(entry);
  };

  const doInit = (): void => {
    initCount++;
    logEvent("Initializing American Express (attempt " + initCount + ")...");
    createAmexStatusIndicator(container, "loading", "Initializing...");

    initBtn.disabled = true;
    reinitBtn.disabled = true;

    window
      .braintree!.client.create({ authorization })
      .then(function (clientInstance) {
        return window.braintree!.americanExpress.create({
          client: clientInstance,
        });
      })
      .then(function (instance) {
        amexInstance = instance;
        rewardsBtn.disabled = false;
        teardownBtn.disabled = false;

        logEvent("American Express initialized successfully");
        createAmexStatusIndicator(container, "ready", "Ready");
        showAmexResult(
          container,
          true,
          "Initialized (attempt " + initCount + ")"
        );
      })
      .catch(function (err) {
        logEvent("Initialization failed: " + err.message);
        createAmexStatusIndicator(container, "error", "Error: " + err.message);
        initBtn.disabled = false;
        showAmexResult(container, false, err.message);
      });
  };

  initBtn.addEventListener("click", doInit);

  rewardsBtn.addEventListener("click", function () {
    if (!amexInstance) return;

    logEvent("Calling getRewardsBalance...");

    amexInstance
      .getRewardsBalance({ nonce: "fake-valid-amex-nonce" })
      .then(function (payload) {
        logEvent("Rewards balance response received");
        displayResponseData(container, payload);
        showAmexResult(container, true, "Rewards balance retrieved");
      })
      .catch(function (err) {
        logEvent("Rewards balance error: " + err.message);
        showAmexResult(container, false, err.message);
      });
  });

  teardownBtn.addEventListener("click", function () {
    if (!amexInstance) return;

    logEvent("Tearing down American Express...");

    amexInstance.teardown().then(function () {
      amexInstance = null;
      rewardsBtn.disabled = true;
      teardownBtn.disabled = true;
      reinitBtn.disabled = false;

      logEvent("American Express torn down");
      createAmexStatusIndicator(container, "loading", "Torn down");
      showAmexResult(container, true, "Torn down successfully");
    });
  });

  reinitBtn.addEventListener("click", doInit);
};

export const ComponentLifecycle: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLifecycleForm();
      container.appendChild(formContainer);
      initializeLifecycle(formContainer);
    },
    ["client.min.js", "american-express.min.js"]
  ),
};
