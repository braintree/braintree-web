/* eslint-disable no-console */
import type { Meta, StoryObj } from "@storybook/html";
import type { IDataCollectorInstance } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./dataCollector.css";

const meta: Meta = {
  title: "Braintree/Data Collector",
  parameters: {
    layout: "centered",
    braintreeScripts: ["data-collector"],
    docs: {
      description: {
        component: `
Data Collector gathers device information for fraud detection and risk assessment.
It integrates with PayPal's Fraudnet service to collect device fingerprints that
correlate user sessions with transactions on your server.

The component collects browser characteristics, screen resolution, timezone, and
other device data to help identify and prevent fraudulent transactions. No personally
identifiable information (PII) is collected.

**Recommended:** Initialize Data Collector as early as possible in the customer
journey for best fraud detection.
        `,
      },
    },
  },
};

export default meta;

// =============================================================================
// Shared Helpers
// =============================================================================

const createStatusIndicator = (
  container: HTMLElement,
  status: "loading" | "ready" | "error",
  message: string
): void => {
  const statusDiv = container.querySelector(
    "#data-collector-status"
  ) as HTMLElement;
  if (!statusDiv) return;

  statusDiv.className = "data-collector-status";
  if (status === "ready") {
    statusDiv.classList.add("data-collector-status--ready");
  } else if (status === "error") {
    statusDiv.classList.add("data-collector-status--error");
  }

  const indicatorClass =
    status === "ready"
      ? "data-collector-status-indicator data-collector-status-indicator--ready"
      : "data-collector-status-indicator";

  statusDiv.textContent = "";
  const span = document.createElement("span");
  span.className = indicatorClass;
  statusDiv.appendChild(span);
  statusDiv.appendChild(document.createTextNode(message));
  statusDiv.style.display = "block";
};

const displayDeviceData = (
  container: HTMLElement,
  instance: IDataCollectorInstance
): void => {
  const deviceDataDiv = container.querySelector(
    "#device-data-display"
  ) as HTMLElement;
  if (!deviceDataDiv) return;

  if (!instance.deviceData) {
    deviceDataDiv.textContent = "No device data available";
    deviceDataDiv.style.display = "block";
    return;
  }

  try {
    const parsed = JSON.parse(instance.deviceData);
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(parsed, null, 2);
    deviceDataDiv.textContent = "";
    deviceDataDiv.appendChild(pre);
  } catch {
    deviceDataDiv.textContent = instance.deviceData;
  }

  deviceDataDiv.style.display = "block";
};

const showResult = (
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

// =============================================================================
// Story: Standard Data Collection (PayPal Fraud)
// =============================================================================

const createStandardForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Data Collector</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Standard data collection using PayPal Fraudnet for device fingerprinting.
          Device data is collected automatically on initialization to help detect
          and prevent fraud.
        </p>
      </div>

      <div class="data-collector-info">
        <strong>How it works:</strong>
        <ul>
          <li>Fraudnet script loads and collects device characteristics</li>
          <li>A correlation ID links client data with server transactions</li>
          <li>No PII is collected - only device fingerprint data</li>
          <li>Device data should be sent with payment transactions</li>
        </ul>
      </div>

      <div id="data-collector-status" class="data-collector-status" style="display: none;"></div>

      <div class="shared-spacing-bottom">
        <button id="collect-btn" class="shared-button" disabled>Collect Device Data</button>
      </div>

      <div id="device-data-display" class="data-collector-device-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Initializing Data Collector...</div>

      <div class="shared-spacing-bottom" style="margin-top: 15px;">
        <button id="teardown-btn" class="shared-button" disabled>Teardown</button>
      </div>
    </div>
  `;

  return container;
};

const initializeStandard = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const collectBtn = container.querySelector(
    "#collect-btn"
  ) as HTMLButtonElement;
  const teardownBtn = container.querySelector(
    "#teardown-btn"
  ) as HTMLButtonElement;

  let dataCollectorInstance: IDataCollectorInstance | null = null;

  createStatusIndicator(container, "loading", "Initializing...");

  window
    .braintree!.client.create({ authorization })
    .then(function (clientInstance) {
      return window.braintree!.dataCollector.create({
        client: clientInstance,
      });
    })
    .then(function (instance) {
      dataCollectorInstance = instance;
      loadingDiv.style.display = "none";
      collectBtn.disabled = false;
      teardownBtn.disabled = false;

      createStatusIndicator(container, "ready", "Data Collector Ready");
      let correlationId = "(unavailable)";
      try {
        correlationId = JSON.parse(instance.deviceData!).correlation_id;
      } catch {
        // deviceData absent or not valid JSON
      }
      showResult(
        container,
        true,
        "Data Collector initialized successfully",
        "Correlation ID: " + correlationId
      );
    })
    .catch(function (err) {
      console.error("Data Collector error:", err);
      loadingDiv.style.display = "none";
      createStatusIndicator(
        container,
        "error",
        "Failed to initialize: " + err.message
      );
      showResult(container, false, err.message);
    });

  collectBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    displayDeviceData(container, dataCollectorInstance);
  });

  teardownBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    dataCollectorInstance.teardown().then(function () {
      dataCollectorInstance = null;
      collectBtn.disabled = true;
      teardownBtn.disabled = true;
      createStatusIndicator(container, "loading", "Torn down");
      showResult(container, true, "Data Collector torn down successfully");
    });
  });
};

export const StandardDataCollection: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createStandardForm();
      container.appendChild(formContainer);
      initializeStandard(formContainer);
    },
    ["client.min.js", "data-collector.min.js"]
  ),
};

// =============================================================================
// Story: Custom Risk Correlation ID
// =============================================================================

const createCustomCorrelationForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Custom Risk Correlation ID</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Configure a custom risk correlation ID to link multiple page loads to the
          same session or use a server-generated session ID.
        </p>
      </div>

      <div class="data-collector-config-panel">
        <h3>Configuration</h3>
        <div class="shared-form-group">
          <label class="shared-label" for="risk-correlation-id">Risk Correlation ID</label>
          <input type="text" id="risk-correlation-id" value="custom-session-12345" class="shared-input" />
        </div>
      </div>

      <div id="data-collector-status" class="data-collector-status" style="display: none;"></div>

      <div class="shared-spacing-bottom">
        <button id="init-btn" class="shared-button">Initialize with Custom ID</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="collect-btn" class="shared-button" disabled>Collect Device Data</button>
      </div>

      <div id="device-data-display" class="data-collector-device-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading" style="display: none;"></div>
    </div>
  `;

  return container;
};

const initializeCustomCorrelation = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const initBtn = container.querySelector("#init-btn") as HTMLButtonElement;
  const collectBtn = container.querySelector(
    "#collect-btn"
  ) as HTMLButtonElement;
  const correlationInput = container.querySelector(
    "#risk-correlation-id"
  ) as HTMLInputElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;

  let dataCollectorInstance: IDataCollectorInstance | null = null;

  initBtn.addEventListener("click", function () {
    const riskCorrelationId = correlationInput.value.trim();
    if (!riskCorrelationId) {
      showResult(container, false, "Please enter a Risk Correlation ID");
      return;
    }

    initBtn.disabled = true;
    loadingDiv.style.display = "block";
    loadingDiv.textContent = "Initializing...";
    createStatusIndicator(container, "loading", "Initializing...");

    window
      .braintree!.client.create({ authorization })
      .then(function (clientInstance) {
        return window.braintree!.dataCollector.create({
          client: clientInstance,
          riskCorrelationId: riskCorrelationId,
        });
      })
      .then(function (instance) {
        dataCollectorInstance = instance;
        loadingDiv.style.display = "none";
        collectBtn.disabled = false;

        createStatusIndicator(container, "ready", "Data Collector Ready");

        let customCorrelationId = "(unavailable)";
        try {
          customCorrelationId = JSON.parse(instance.deviceData!).correlation_id;
        } catch {
          // deviceData absent or not valid JSON
        }
        showResult(
          container,
          true,
          "Initialized with custom correlation ID",
          "Correlation ID: " + customCorrelationId
        );
      })
      .catch(function (err) {
        console.error("Data Collector error:", err);
        loadingDiv.style.display = "none";
        initBtn.disabled = false;
        createStatusIndicator(container, "error", "Failed: " + err.message);
        showResult(container, false, err.message);
      });
  });

  collectBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;
    displayDeviceData(container, dataCollectorInstance);
  });
};

export const CustomCorrelationId: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createCustomCorrelationForm();
      container.appendChild(formContainer);
      initializeCustomCorrelation(formContainer);
    },
    ["client.min.js", "data-collector.min.js"]
  ),
};

// =============================================================================
// Story: Deferred Client Configuration
// =============================================================================

const createDeferredClientForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Deferred Client Setup</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Use deferred client creation for immediate Data Collector availability.
          The client configuration is fetched in the background while the component
          is already accessible. Use <code>getDeviceData()</code> to collect data
          once the client is ready.
        </p>
      </div>

      <div class="data-collector-info">
        <strong>Deferred client benefits:</strong>
        <ul>
          <li>Component instance available immediately</li>
          <li>Client fetched in background, non-blocking</li>
          <li>Use getDeviceData() to wait for data readiness</li>
        </ul>
      </div>

      <div id="data-collector-status" class="data-collector-status" style="display: none;"></div>

      <div class="shared-spacing-bottom">
        <button id="get-device-data-btn" class="shared-button" disabled>Get Device Data</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="get-raw-data-btn" class="shared-button" disabled>Get Raw Device Data</button>
      </div>

      <div id="device-data-display" class="data-collector-device-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading">Creating deferred Data Collector...</div>
    </div>
  `;

  return container;
};

const initializeDeferredClient = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const loadingDiv = container.querySelector("#loading") as HTMLElement;
  const getDeviceDataBtn = container.querySelector(
    "#get-device-data-btn"
  ) as HTMLButtonElement;
  const getRawDataBtn = container.querySelector(
    "#get-raw-data-btn"
  ) as HTMLButtonElement;

  let dataCollectorInstance: IDataCollectorInstance | null = null;

  createStatusIndicator(container, "loading", "Creating deferred client...");

  window
    .braintree!.dataCollector.create({
      authorization: authorization,
      useDeferredClient: true,
    })
    .then(function (instance) {
      dataCollectorInstance = instance;
      loadingDiv.style.display = "none";
      getDeviceDataBtn.disabled = false;
      getRawDataBtn.disabled = false;

      createStatusIndicator(
        container,
        "ready",
        "Deferred Data Collector Ready"
      );
      showResult(
        container,
        true,
        "Deferred Data Collector created",
        "Use getDeviceData() to collect data when ready"
      );
    })
    .catch(function (err) {
      console.error("Deferred Data Collector error:", err);
      loadingDiv.style.display = "none";
      createStatusIndicator(container, "error", "Failed: " + err.message);
      showResult(container, false, err.message);
    });

  getDeviceDataBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    createStatusIndicator(container, "loading", "Fetching device data...");

    dataCollectorInstance
      .getDeviceData()
      .then(function (deviceData) {
        createStatusIndicator(container, "ready", "Device data collected");

        const deviceDataDiv = container.querySelector(
          "#device-data-display"
        ) as HTMLElement;
        try {
          const parsed =
            typeof deviceData === "string"
              ? JSON.parse(deviceData)
              : deviceData;
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(parsed, null, 2);
          deviceDataDiv.textContent = "";
          deviceDataDiv.appendChild(pre);
        } catch {
          deviceDataDiv.textContent =
            typeof deviceData === "string"
              ? deviceData
              : JSON.stringify(deviceData);
        }
        deviceDataDiv.style.display = "block";

        showResult(container, true, "Device data collected successfully");
      })
      .catch(function (err: Error) {
        createStatusIndicator(container, "error", "Failed: " + err.message);
        showResult(container, false, err.message);
      });
  });

  getRawDataBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    createStatusIndicator(container, "loading", "Fetching raw device data...");

    dataCollectorInstance
      .getDeviceData({ raw: true })
      .then(function (rawData) {
        createStatusIndicator(container, "ready", "Raw device data collected");

        const deviceDataDiv = container.querySelector(
          "#device-data-display"
        ) as HTMLElement;
        const rawPre = document.createElement("pre");
        rawPre.textContent = JSON.stringify(rawData, null, 2);
        deviceDataDiv.textContent = "";
        deviceDataDiv.appendChild(rawPre);
        deviceDataDiv.style.display = "block";

        showResult(container, true, "Raw device data collected");
      })
      .catch(function (err: Error) {
        createStatusIndicator(container, "error", "Failed: " + err.message);
        showResult(container, false, err.message);
      });
  });
};

export const DeferredClientSetup: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createDeferredClientForm();
      container.appendChild(formContainer);
      initializeDeferredClient(formContainer);
    },
    ["client.min.js", "data-collector.min.js"]
  ),
};

// =============================================================================
// Story: Multiple Instances
// =============================================================================

const createMultipleInstancesForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container">
      <h2>Multiple Data Collector Instances</h2>

      <div class="shared-spacing-bottom">
        <p class="shared-description">
          Demonstrates creating multiple Data Collector instances on the same page.
          Each instance maintains its own device data and can be torn down independently.
        </p>
      </div>

      <div class="data-collector-config-panel">
        <h3>Instance 1</h3>
        <div id="instance-1-status" class="data-collector-status" style="display: none;"></div>
        <div id="instance-1-data" class="data-collector-device-data" style="display: none;"></div>
      </div>

      <div class="data-collector-config-panel">
        <h3>Instance 2</h3>
        <div class="shared-form-group">
          <label class="shared-label" for="instance-2-correlation-id">Correlation ID</label>
          <input type="text" id="instance-2-correlation-id" value="second-instance-id" class="shared-input" />
        </div>
        <div id="instance-2-status" class="data-collector-status" style="display: none;"></div>
        <div id="instance-2-data" class="data-collector-device-data" style="display: none;"></div>
      </div>

      <div class="shared-spacing-bottom">
        <button id="create-both-btn" class="shared-button">Create Both Instances</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="collect-both-btn" class="shared-button" disabled>Collect Both</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="teardown-both-btn" class="shared-button" disabled>Teardown Both</button>
      </div>

      <div id="result" class="shared-result"></div>

      <div id="loading" class="shared-loading" style="display: none;"></div>
    </div>
  `;

  return container;
};

const updateInstanceStatus = (
  container: HTMLElement,
  instanceId: string,
  status: "loading" | "ready" | "error",
  message: string
): void => {
  const statusDiv = container.querySelector(
    "#" + instanceId + "-status"
  ) as HTMLElement;
  if (!statusDiv) return;

  statusDiv.className = "data-collector-status";
  if (status === "ready") {
    statusDiv.classList.add("data-collector-status--ready");
  } else if (status === "error") {
    statusDiv.classList.add("data-collector-status--error");
  }

  const indicatorClass =
    status === "ready"
      ? "data-collector-status-indicator data-collector-status-indicator--ready"
      : "data-collector-status-indicator";

  statusDiv.textContent = "";
  const span = document.createElement("span");
  span.className = indicatorClass;
  statusDiv.appendChild(span);
  statusDiv.appendChild(document.createTextNode(message));
  statusDiv.style.display = "block";
};

const initializeMultipleInstances = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const createBothBtn = container.querySelector(
    "#create-both-btn"
  ) as HTMLButtonElement;
  const collectBothBtn = container.querySelector(
    "#collect-both-btn"
  ) as HTMLButtonElement;
  const teardownBothBtn = container.querySelector(
    "#teardown-both-btn"
  ) as HTMLButtonElement;
  const correlationInput = container.querySelector(
    "#instance-2-correlation-id"
  ) as HTMLInputElement;
  const loadingDiv = container.querySelector("#loading") as HTMLElement;

  let instance1: IDataCollectorInstance | null = null;
  let instance2: IDataCollectorInstance | null = null;

  createBothBtn.addEventListener("click", function () {
    createBothBtn.disabled = true;
    loadingDiv.style.display = "block";
    loadingDiv.textContent = "Creating instances...";

    updateInstanceStatus(container, "instance-1", "loading", "Creating...");
    updateInstanceStatus(container, "instance-2", "loading", "Creating...");

    window
      .braintree!.client.create({ authorization })
      .then(function (clientInstance) {
        let anyFailed = false;

        const promise1 = window
          .braintree!.dataCollector.create({ client: clientInstance })
          .then(function (inst) {
            instance1 = inst;
            updateInstanceStatus(container, "instance-1", "ready", "Ready");
          })
          .catch(function (err) {
            anyFailed = true;
            updateInstanceStatus(
              container,
              "instance-1",
              "error",
              "Error: " + err.message
            );
          });

        const promise2 = window
          .braintree!.dataCollector.create({
            client: clientInstance,
            riskCorrelationId: correlationInput.value.trim() || undefined,
          })
          .then(function (inst) {
            instance2 = inst;
            updateInstanceStatus(container, "instance-2", "ready", "Ready");
          })
          .catch(function (err) {
            anyFailed = true;
            updateInstanceStatus(
              container,
              "instance-2",
              "error",
              "Error: " + err.message
            );
          });

        return Promise.all([promise1, promise2]).then(function () {
          return anyFailed;
        });
      })
      .then(function (anyFailed) {
        loadingDiv.style.display = "none";
        collectBothBtn.disabled = false;
        teardownBothBtn.disabled = false;
        if (!anyFailed) {
          showResult(container, true, "Both instances created successfully");
        }
      })
      .catch(function (err) {
        loadingDiv.style.display = "none";
        createBothBtn.disabled = false;
        showResult(container, false, err.message);
      });
  });

  collectBothBtn.addEventListener("click", function () {
    if (instance1) {
      const data1Div = container.querySelector(
        "#instance-1-data"
      ) as HTMLElement;
      try {
        const parsed1 = JSON.parse(instance1.deviceData!);
        const pre1 = document.createElement("pre");
        pre1.textContent = JSON.stringify(parsed1, null, 2);
        data1Div.textContent = "";
        data1Div.appendChild(pre1);
      } catch {
        data1Div.textContent = instance1.deviceData;
      }
      data1Div.style.display = "block";
    }

    if (instance2) {
      const data2Div = container.querySelector(
        "#instance-2-data"
      ) as HTMLElement;
      try {
        const parsed2 = JSON.parse(instance2.deviceData!);
        const pre2 = document.createElement("pre");
        pre2.textContent = JSON.stringify(parsed2, null, 2);
        data2Div.textContent = "";
        data2Div.appendChild(pre2);
      } catch {
        data2Div.textContent = instance2.deviceData;
      }
      data2Div.style.display = "block";
    }
  });

  teardownBothBtn.addEventListener("click", function () {
    const promises: Promise<void>[] = [];
    if (instance1) {
      promises.push(
        instance1.teardown().then(function () {
          instance1 = null;
          updateInstanceStatus(container, "instance-1", "loading", "Torn down");
        })
      );
    }
    if (instance2) {
      promises.push(
        instance2.teardown().then(function () {
          instance2 = null;
          updateInstanceStatus(container, "instance-2", "loading", "Torn down");
        })
      );
    }

    Promise.all(promises).then(function () {
      collectBothBtn.disabled = true;
      teardownBothBtn.disabled = true;
      createBothBtn.disabled = false;
      showResult(container, true, "Both instances torn down");
    });
  });
};

export const MultipleInstances: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createMultipleInstancesForm();
      container.appendChild(formContainer);
      initializeMultipleInstances(formContainer);
    },
    ["client.min.js", "data-collector.min.js"]
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
          Demonstrates the full lifecycle of the Data Collector: initialization,
          data collection, teardown, and re-initialization.
        </p>
      </div>

      <div id="data-collector-status" class="data-collector-status" style="display: none;"></div>

      <div id="lifecycle-log" class="data-collector-device-data" style="display: block; min-height: 100px;">
        <em>Lifecycle events will appear here...</em>
      </div>

      <div class="shared-spacing-bottom" style="margin-top: 15px;">
        <button id="init-btn" class="shared-button">1. Initialize</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="collect-btn" class="shared-button" disabled>2. Collect Data</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="teardown-btn" class="shared-button" disabled>3. Teardown</button>
      </div>

      <div class="shared-spacing-bottom">
        <button id="reinit-btn" class="shared-button" disabled>4. Re-initialize</button>
      </div>

      <div id="device-data-display" class="data-collector-device-data" style="display: none;"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const initializeLifecycle = (container: HTMLElement): void => {
  const authorization = getAuthorizationToken();
  const initBtn = container.querySelector("#init-btn") as HTMLButtonElement;
  const collectBtn = container.querySelector(
    "#collect-btn"
  ) as HTMLButtonElement;
  const teardownBtn = container.querySelector(
    "#teardown-btn"
  ) as HTMLButtonElement;
  const reinitBtn = container.querySelector("#reinit-btn") as HTMLButtonElement;
  const logDiv = container.querySelector("#lifecycle-log") as HTMLElement;

  let dataCollectorInstance: IDataCollectorInstance | null = null;
  let initCount = 0;

  const logEvent = (event: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.textContent = "[" + timestamp + "] " + event;
    if (logDiv.querySelector("em")) {
      logDiv.innerHTML = "";
    }
    logDiv.appendChild(entry);
  };

  const doInit = (): void => {
    initCount++;
    logEvent("Initializing Data Collector (attempt " + initCount + ")...");
    createStatusIndicator(container, "loading", "Initializing...");

    initBtn.disabled = true;
    reinitBtn.disabled = true;

    window
      .braintree!.client.create({ authorization })
      .then(function (clientInstance) {
        return window.braintree!.dataCollector.create({
          client: clientInstance,
        });
      })
      .then(function (instance) {
        dataCollectorInstance = instance;
        collectBtn.disabled = false;
        teardownBtn.disabled = false;

        logEvent("Data Collector initialized successfully");
        createStatusIndicator(container, "ready", "Ready");
        showResult(container, true, "Initialized (attempt " + initCount + ")");
      })
      .catch(function (err) {
        logEvent("Initialization failed: " + err.message);
        createStatusIndicator(container, "error", "Error: " + err.message);
        initBtn.disabled = false;
        showResult(container, false, err.message);
      });
  };

  initBtn.addEventListener("click", doInit);

  collectBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    logEvent("Collecting device data...");
    displayDeviceData(container, dataCollectorInstance);
    logEvent("Device data collected");
    showResult(container, true, "Device data collected");
  });

  teardownBtn.addEventListener("click", function () {
    if (!dataCollectorInstance) return;

    logEvent("Tearing down Data Collector...");

    dataCollectorInstance.teardown().then(function () {
      dataCollectorInstance = null;
      collectBtn.disabled = true;
      teardownBtn.disabled = true;
      reinitBtn.disabled = false;

      logEvent("Data Collector torn down");
      createStatusIndicator(container, "loading", "Torn down");
      showResult(container, true, "Torn down successfully");
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
    ["client.min.js", "data-collector.min.js"]
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
          Demonstrates how the Data Collector handles various error scenarios
          including invalid configurations and network issues.
        </p>
      </div>

      <div class="data-collector-config-panel">
        <h3>Error Scenarios</h3>
        <div class="shared-form-group">
          <label class="shared-label">
            <input type="radio" name="error-scenario" id="scenario-invalid-auth" value="invalid-auth" checked>
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

      <div id="data-collector-status" class="data-collector-status" style="display: none;"></div>

      <div class="shared-spacing-bottom">
        <button id="test-btn" class="shared-button">Test Scenario</button>
      </div>

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
    createStatusIndicator(container, "loading", "Testing...");

    const authToUse =
      selectedScenario === "invalid-auth"
        ? "invalid_tokenization_key"
        : authorization;

    window
      .braintree!.client.create({ authorization: authToUse })
      .then(function (clientInstance) {
        return window.braintree!.dataCollector.create({
          client: clientInstance,
        });
      })
      .then(function (instance) {
        loadingDiv.style.display = "none";
        testBtn.disabled = false;

        createStatusIndicator(container, "ready", "Success");
        let testCorrelationId = "(unavailable)";
        try {
          testCorrelationId = JSON.parse(instance.deviceData!).correlation_id;
        } catch {
          // deviceData absent or not valid JSON
        }
        showResult(
          container,
          true,
          "Data Collector created successfully",
          "Correlation ID: " + testCorrelationId
        );

        instance.teardown().catch(function (err) {
          console.error("teardown failed:", err);
        });
      })
      .catch(function (err) {
        loadingDiv.style.display = "none";
        testBtn.disabled = false;

        createStatusIndicator(container, "error", "Error: " + err.message);
        showResult(
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
    ["client.min.js", "data-collector.min.js"]
  ),
};
