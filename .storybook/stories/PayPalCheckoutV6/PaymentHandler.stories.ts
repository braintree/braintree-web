import type { Meta, StoryObj } from "@storybook/html";
import type { IPayPalV6ApproveData, IBraintreeError } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import "../../css/main.css";
import "../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Checkout V6 - PaymentHandler Pattern

The PaymentHandler pattern demonstrates an advanced approach where developers
explicitly control the presentation mode fallback sequence. Unlike the standard
"auto" mode which lets the SDK decide, PaymentHandler gives full control over
which presentation modes to attempt and in what order.

**Fallback Sequence:**
1. payment-handler - Native browser Payment Handler API
2. popup - Traditional PayPal popup window
3. modal - Embedded modal/iframe approach

**Error Handling:**
- Recoverable errors (isRecoverable: true) trigger fallback to next mode
- Terminal errors abort the flow entirely
        `,
      },
    },
  },
};

export default meta;

type StatusType = "attempting" | "recoverable" | "success" | "terminal";

const PRESENTATION_MODES = ["payment-handler", "popup", "modal"] as const;

/**
 * Normalize order ID from PayPal callback data
 * PayPal V6 SDK may return orderID or orderId depending on the callback
 */
const getOrderId = (data: { orderID?: string; orderId?: string }): string => {
  return data.orderID || data.orderId || "";
};

/**
 * Extract all properties from an error object, including nested ones
 */
const extractErrorDetails = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorObj: any,
  prefix = ""
): string[] => {
  const parts: string[] = [];

  if (!errorObj || typeof errorObj !== "object") {
    return parts;
  }

  const propsToCheck = [
    "message",
    "error",
    "name",
    "code",
    "type",
    "description",
    "debug_id",
    "debugId",
    "httpStatus",
    "statusCode",
    "status",
    "reason",
    "errorName",
    "errorMessage",
    "isRecoverable",
  ];

  for (const prop of propsToCheck) {
    if (errorObj[prop] !== undefined && errorObj[prop] !== null) {
      const label = prefix ? `${prefix}.${prop}` : prop;
      parts.push(`${label}: ${errorObj[prop]}`);
    }
  }

  const nestedProps = [
    "details",
    "originalError",
    "error",
    "data",
    "body",
    "response",
  ];
  for (const prop of nestedProps) {
    if (
      errorObj[prop] &&
      typeof errorObj[prop] === "object" &&
      !Array.isArray(errorObj[prop])
    ) {
      const nested = extractErrorDetails(
        errorObj[prop],
        prefix ? `${prefix}.${prop}` : prop
      );
      parts.push(...nested);
    }
  }

  return parts;
};

/**
 * Display detailed error information for debugging
 */
const showDetailedError = (
  resultDiv: HTMLElement,
  title: string,
  err: IBraintreeError
): void => {
  const errorCode = err.code || "UNKNOWN";
  const errorMessage = err.message || "An error occurred";
  const errorType = err.type || "Unknown";

  const extractedDetails = extractErrorDetails(err);

  let fullErrorJson = "";
  try {
    fullErrorJson = JSON.stringify(err, null, 2);
    if (fullErrorJson === "{}") {
      const errorProps: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        errorProps[key] = (err as unknown as Record<string, unknown>)[key];
      }
      if (err.details) {
        errorProps["details"] = err.details;
      }
      fullErrorJson = JSON.stringify(errorProps, null, 2);
    }
  } catch {
    fullErrorJson = "[Could not serialize error]";
  }

  resultDiv.className =
    "shared-result shared-result--visible shared-result--error";
  resultDiv.innerHTML = `
    <strong>${title}</strong><br>
    <small><strong>Code:</strong> ${errorCode}</small><br>
    <small><strong>Type:</strong> ${errorType}</small><br>
    <small><strong>Message:</strong> ${errorMessage}</small><br>
    ${
      extractedDetails.length > 0
        ? `<small><strong>Details:</strong></small>
    <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; max-height: 200px; overflow-y: auto;">${extractedDetails.join("\n")}</pre>`
        : ""
    }
    <details style="margin-top: 10px;">
      <summary style="cursor: pointer; font-size: 12px; color: #666;">Show Full Error Object</summary>
      <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 10px; background: #f0f0f0; padding: 8px; border-radius: 4px; overflow-x: auto; max-height: 300px; overflow-y: auto;">${fullErrorJson}</pre>
    </details>
  `;

  // eslint-disable-next-line no-console
  console.error(`${title}:`, err);
};

const createPaymentHandlerForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container" style="max-width: 550px;">
      <h2>PayPal V6 - PaymentHandler Pattern</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example demonstrates the PaymentHandler pattern where developers explicitly
          control the presentation mode fallback sequence. The flow attempts modes in order:
          <strong>payment-handler</strong> (native browser API) &rarr;
          <strong>popup</strong> &rarr; <strong>modal</strong>.
        </p>
        <p class="shared-description" style="margin-top: 10px; font-size: 13px; color: #666;">
          Recoverable errors (isRecoverable: true) trigger fallback to the next mode.
          Terminal errors abort the flow entirely.
        </p>
      </div>

      <div id="status-log-container" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #495057;">Presentation Mode Status</h3>
        <ol id="status-log" style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;"></ol>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const getStatusColor = (status: StatusType): string => {
  switch (status) {
    case "attempting":
      return "#0066cc";
    case "recoverable":
      return "#cc8800";
    case "success":
      return "#28a745";
    case "terminal":
      return "#dc3545";
    default:
      return "#666666";
  }
};

const getStatusIcon = (status: StatusType): string => {
  switch (status) {
    case "attempting":
      return "&#8635;"; // Rotating arrow
    case "recoverable":
      return "&#9888;"; // Warning triangle
    case "success":
      return "&#10003;"; // Checkmark
    case "terminal":
      return "&#10007;"; // X mark
    default:
      return "&#8226;"; // Bullet
  }
};

const addStatusEntry = (
  statusLog: HTMLElement,
  message: string,
  status: StatusType
): HTMLLIElement => {
  const entry = document.createElement("li");
  const color = getStatusColor(status);
  const icon = getStatusIcon(status);

  entry.innerHTML = `
    <span style="color: ${color}; font-weight: 500;">
      <span style="margin-right: 6px;">${icon}</span>
      ${message}
    </span>
  `;
  entry.style.marginBottom = "4px";

  statusLog.appendChild(entry);
  return entry;
};

const clearStatusLog = (statusLog: HTMLElement): void => {
  statusLog.innerHTML = "";
};

const setupPaymentHandler = async (container: HTMLElement): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const statusLog = container.querySelector("#status-log") as HTMLElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
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

    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: "25.00",
      currency: "USD",
      intent: "capture",

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
          <strong>PayPal payment authorized!</strong><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Payer Email: ${payload.details.email}</small><br>
          <small>Amount: $25.00</small>
        `;
      },

      onCancel: () => {
        addStatusEntry(statusLog, "Payment cancelled by user", "terminal");
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

    // Render PayPal button with PaymentHandler fallback logic
    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay with PayPal";
    button.className = "paypal-button";
    button.id = "payment-handler-button";
    button.style.cssText = `
      background-color: #0070ba;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
    `;

    button.addEventListener("click", async () => {
      // Clear previous status entries
      clearStatusLog(statusLog);
      resultDiv.className = "shared-result";
      resultDiv.innerHTML = "";

      // Disable button during processing
      button.disabled = true;
      button.style.opacity = "0.6";
      button.style.cursor = "not-allowed";

      try {
        // PaymentHandler pattern: iterate through presentation modes
        for (const mode of PRESENTATION_MODES) {
          addStatusEntry(statusLog, `Attempting ${mode} mode...`, "attempting");

          try {
            const result = await session.start({ presentationMode: mode });

            // Check if session.start() returned a falsy value (mode unavailable)
            // PayPal SDK returns false when a presentation mode is not available
            if (result === false) {
              addStatusEntry(
                statusLog,
                `${mode} mode not available - trying next...`,
                "recoverable"
              );
              continue;
            }

            // If we get here, the mode succeeded
            addStatusEntry(statusLog, `${mode} mode succeeded!`, "success");
            break; // Exit loop on success
          } catch (error) {
            // Guard against non-Error values in catch
            if (!error || typeof error !== "object") {
              addStatusEntry(
                statusLog,
                `${mode} mode failed unexpectedly - trying next...`,
                "recoverable"
              );
              continue;
            }

            const typedError = error as IBraintreeError & {
              isRecoverable?: boolean;
            };

            if (typedError.isRecoverable) {
              // Recoverable error - try next mode
              const errorMsg = typedError.message || "Unknown error";
              addStatusEntry(
                statusLog,
                `${mode} mode failed (recoverable): ${errorMsg} - trying next...`,
                "recoverable"
              );
              continue;
            }

            // Terminal error - stop and show error
            const errorMsg = typedError.message || "Unknown error";
            addStatusEntry(
              statusLog,
              `${mode} mode failed (terminal): ${errorMsg}`,
              "terminal"
            );
            throw error;
          }
        }
      } catch (error) {
        showDetailedError(
          resultDiv,
          "Payment Flow Error",
          error as IBraintreeError
        );
      } finally {
        // Re-enable button
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
      }
    });

    paypalButtonContainer.appendChild(button);
  } catch (error) {
    showDetailedError(
      resultDiv,
      "Initialization Error",
      error as IBraintreeError
    );
  }
};

export const PaymentHandler: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createPaymentHandlerForm();
      container.appendChild(formContainer);
      await setupPaymentHandler(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
