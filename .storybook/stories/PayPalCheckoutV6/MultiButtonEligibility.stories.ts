import type { Meta, StoryObj } from "@storybook/html";
import type { IPayPalV6ApproveData, IBraintreeError } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import "../../css/main.css";
import "../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Multi-Button Eligibility",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
Demonstrates dynamic payment button rendering based on eligibility.

**Use Case:** Merchants can use \`findEligibleMethods()\` to check which payment methods
(PayPal, Pay Later, PayPal Credit) are eligible before rendering buttons.
This ensures customers only see payment options that are available to them.

**How It Works:**
1. Enter an amount and select a currency
2. Click "Check Eligibility" to query PayPal for available methods
3. Buttons appear/hide based on eligibility results
4. Click any eligible button to complete payment

**Eligibility Factors:**
- Amount (some methods have minimums)
- Currency (Pay Later availability varies)
- Merchant configuration
- Buyer location
- PayPal account features
        `,
      },
    },
  },
};

export default meta;

/**
 * Normalize order ID from PayPal callback data
 */
const getOrderId = (data: { orderID?: string; orderId?: string }): string => {
  return data.orderID || data.orderId || "";
};

/**
 * Extract error details for debugging
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
  ];

  for (const prop of propsToCheck) {
    if (errorObj[prop] !== undefined && errorObj[prop] !== null) {
      const label = prefix ? `${prefix}.${prop}` : prop;
      parts.push(`${label}: ${errorObj[prop]}`);
    }
  }

  const nestedProps = ["details", "originalError", "error", "data", "body"];
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
 * Display detailed error information
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
    <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px;">${extractedDetails.join("\n")}</pre>`
        : ""
    }
  `;

  // eslint-disable-next-line no-console
  console.error(`${title}:`, err);
};

/**
 * Create the multi-button eligibility form HTML
 */
const createMultiButtonForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container" style="max-width: 500px;">
      <h2>Multi-Button Eligibility Demo</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Check which payment methods are eligible for your transaction,
          then pay with any available option.
        </p>
      </div>

      <!-- Input Controls -->
      <div class="paypal-form-group">
        <label class="shared-label" for="amount">Amount</label>
        <input type="text" id="amount" class="shared-input" value="100.00" placeholder="e.g., 100.00">
      </div>

      <div class="paypal-form-group">
        <label class="shared-label" for="currency">Currency</label>
        <select id="currency" class="shared-select">
          <option value="USD" selected>USD - US Dollar</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="EUR">EUR - Euro</option>
          <option value="CAD">CAD - Canadian Dollar</option>
          <option value="AUD">AUD - Australian Dollar</option>
        </select>
      </div>

      <button id="check-eligibility" class="shared-button" style="margin-bottom: 20px;">
        Check Eligibility
      </button>

      <!-- Eligibility Status -->
      <div id="eligibility-status" style="margin-bottom: 20px;"></div>

      <!-- Payment Buttons (hidden by default) -->
      <div id="paypal-button-container" class="paypal-button-container" style="display: none; margin-bottom: 10px;">
        <button id="paypal-button" class="paypal-button" style="
          background-color: #0070ba;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
        ">Pay with PayPal</button>
      </div>

      <div id="paylater-button-container" class="paypal-button-container" style="display: none; margin-bottom: 10px;">
        <button id="paylater-button" class="paypal-button" style="
          background-color: #ffc439;
          color: #003087;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
        ">Pay in 4</button>
      </div>

      <div id="credit-button-container" class="paypal-button-container" style="display: none; margin-bottom: 10px;">
        <button id="credit-button" class="paypal-button" style="
          background-color: #003087;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
        ">PayPal Credit</button>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

interface EligibilityResult {
  paypal: boolean;
  paylater: boolean;
  credit: boolean;
}

interface PayPalCheckoutV6Instance {
  findEligibleMethods: (_options: {
    currency: string;
    amount: string;
  }) => Promise<EligibilityResult>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createOneTimePaymentSession: (_options: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenizePayment: (_options: any) => Promise<any>;
  loadPayPalSDK: () => Promise<PayPalCheckoutV6Instance>;
}

/**
 * Setup the multi-button eligibility demo
 */
const setupMultiButtonEligibility = async (
  container: HTMLElement
): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const eligibilityStatus = container.querySelector(
    "#eligibility-status"
  ) as HTMLElement;
  const amountInput = container.querySelector("#amount") as HTMLInputElement;
  const currencySelect = container.querySelector(
    "#currency"
  ) as HTMLSelectElement;
  const checkEligibilityButton = container.querySelector(
    "#check-eligibility"
  ) as HTMLButtonElement;

  // Button containers
  const paypalContainer = container.querySelector(
    "#paypal-button-container"
  ) as HTMLElement;
  const paylaterContainer = container.querySelector(
    "#paylater-button-container"
  ) as HTMLElement;
  const creditContainer = container.querySelector(
    "#credit-button-container"
  ) as HTMLElement;

  // Buttons
  const paypalButton = container.querySelector(
    "#paypal-button"
  ) as HTMLButtonElement;
  const paylaterButton = container.querySelector(
    "#paylater-button"
  ) as HTMLButtonElement;
  const creditButton = container.querySelector(
    "#credit-button"
  ) as HTMLButtonElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
    return;
  }

  let paypalCheckoutV6Instance: PayPalCheckoutV6Instance;
  let currentEligibility: EligibilityResult | null = null;

  try {
    const braintree = getBraintreeSDK(resultDiv);
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });

    paypalCheckoutV6Instance = (await braintree.paypalCheckoutV6.create({
      client: clientInstance,
    })) as unknown as PayPalCheckoutV6Instance;

    await paypalCheckoutV6Instance.loadPayPalSDK();

    // Enable the check eligibility button
    checkEligibilityButton.disabled = false;
  } catch (error) {
    showDetailedError(
      resultDiv,
      "Initialization Error",
      error as IBraintreeError
    );
    return;
  }

  /**
   * Create a payment session and handle the flow
   */
  const createPaymentAndStart = (offerCredit: boolean): void => {
    const amount = amountInput.value.trim();
    const currency = currencySelect.value;

    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount,
      currency,
      intent: "capture",
      offerCredit,

      onApprove: async (data: IPayPalV6ApproveData) => {
        try {
          const tokenizeData = {
            payerID: data.payerID || data.payerId || data.PayerID,
            orderID: getOrderId(data),
          };

          const payload =
            await paypalCheckoutV6Instance.tokenizePayment(tokenizeData);

          const paymentType = offerCredit ? "PayPal Credit" : "PayPal";
          resultDiv.className =
            "shared-result shared-result--visible shared-result--success";
          resultDiv.innerHTML = `
            <strong>${paymentType} payment authorized!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Payer Email: ${payload.details.email}</small><br>
            <small>Amount: $${amount} ${currency}</small>
            ${payload.creditFinancingOffered ? "<br><small>Credit financing was offered</small>" : ""}
          `;
        } catch (error) {
          showDetailedError(
            resultDiv,
            "Tokenization Error",
            error as IBraintreeError
          );
        }
      },

      onCancel: () => {
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

    session.start();
  };

  /**
   * Check eligibility for the current amount/currency
   */
  const checkEligibility = async (): Promise<void> => {
    const amount = amountInput.value.trim();
    const currency = currencySelect.value;

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      eligibilityStatus.className =
        "shared-result shared-result--visible shared-result--error";
      eligibilityStatus.innerHTML = `
        <strong>Invalid Amount</strong><br>
        <small>Please enter a valid positive amount.</small>
      `;
      return;
    }

    // Hide all buttons while checking
    paypalContainer.style.display = "none";
    paylaterContainer.style.display = "none";
    creditContainer.style.display = "none";

    eligibilityStatus.className = "shared-result shared-result--visible";
    eligibilityStatus.style.background = "#f5f7fa";
    eligibilityStatus.style.border = "1px solid #ddd";
    eligibilityStatus.innerHTML = `
      <small>Checking eligibility for $${amount} ${currency}...</small>
    `;

    try {
      currentEligibility = await paypalCheckoutV6Instance.findEligibleMethods({
        currency,
        amount,
      });

      // Build eligibility status display
      const statusParts: string[] = [];

      if (currentEligibility.paypal) {
        statusParts.push('<span style="color: #28a745;">PayPal</span>');
        paypalContainer.style.display = "block";
      }

      if (currentEligibility.paylater) {
        statusParts.push('<span style="color: #28a745;">Pay Later</span>');
        paylaterContainer.style.display = "block";
      }

      if (currentEligibility.credit) {
        statusParts.push('<span style="color: #28a745;">PayPal Credit</span>');
        creditContainer.style.display = "block";
      }

      if (statusParts.length === 0) {
        eligibilityStatus.className =
          "shared-result shared-result--visible shared-result--error";
        eligibilityStatus.innerHTML = `
          <strong>No Eligible Methods</strong><br>
          <small>No payment methods are eligible for this transaction.</small><br>
          <small>Try a different amount or currency.</small>
        `;
      } else {
        eligibilityStatus.className =
          "shared-result shared-result--visible shared-result--success";
        eligibilityStatus.innerHTML = `
          <strong>Eligible Methods:</strong> ${statusParts.join(", ")}<br>
          <small style="color: #666;">Amount: $${amount} ${currency}</small>
        `;
      }
    } catch (error) {
      currentEligibility = null;
      showDetailedError(
        eligibilityStatus,
        "Eligibility Check Failed",
        error as IBraintreeError
      );
    }
  };

  // Event listeners
  checkEligibilityButton.addEventListener("click", checkEligibility);

  paypalButton.addEventListener("click", () => {
    createPaymentAndStart(false);
  });

  paylaterButton.addEventListener("click", () => {
    // Pay Later uses standard PayPal session (eligibility determines availability)
    createPaymentAndStart(false);
  });

  creditButton.addEventListener("click", () => {
    createPaymentAndStart(true);
  });
};

export const MultiButtonEligibility: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createMultiButtonForm();
      container.appendChild(formContainer);
      await setupMultiButtonEligibility(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
