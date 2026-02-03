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
PayPal Checkout V6 - Payment integration with multiple flow types.

**Payment Flow Types:**
- **One-Time Payments**: Best for infrequent payments with higher AOV (retail, e-commerce)
- **Vaulted Payments**: Ideal for high-frequency, low-AOV purchases (food delivery, marketplaces)
- **Recurring Payments**: Perfect for subscriptions and automated billing (SaaS, streaming, utilities)
- **Vault-Initiated Checkout**: Use a previously vaulted PayPal account for subsequent payments

**Implementation Features:**
- One-time payment session creation
- Billing agreement/vault flow
- Vault-initiated checkout
- Payment tokenization
- Line items and shipping options support
- PayPal Credit support
- Presentation mode control
- Dynamic payment updates
- Comprehensive analytics

**Requirements:** V6 requires a client token (not a tokenization key).
        `,
      },
    },
  },
};

export default meta;

/**
 * Normalize order ID from PayPal callback data
 * PayPal V6 SDK may return orderID or orderId depending on the callback
 */
const getOrderId = (data: { orderID?: string; orderId?: string }): string => {
  return data.orderID || data.orderId || "";
};

/**
 * Extract all properties from an error object, including nested ones
 * This handles various error structures from Braintree/PayPal
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

  // Common error properties to extract
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
  ];

  for (const prop of propsToCheck) {
    if (errorObj[prop] !== undefined && errorObj[prop] !== null) {
      const label = prefix ? `${prefix}.${prop}` : prop;
      parts.push(`${label}: ${errorObj[prop]}`);
    }
  }

  // Check nested objects
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
 * Extracts error details from various possible locations in the error object
 */
const showDetailedError = (
  resultDiv: HTMLElement,
  title: string,
  err: IBraintreeError
): void => {
  const errorCode = err.code || "UNKNOWN";
  const errorMessage = err.message || "An error occurred";
  const errorType = err.type || "Unknown";

  // Extract all nested error details
  const extractedDetails = extractErrorDetails(err);

  // Try to serialize the full error object for complete visibility
  let fullErrorJson = "";
  try {
    fullErrorJson = JSON.stringify(err, null, 2);
    if (fullErrorJson === "{}") {
      // Error objects often don't serialize well, try getting own properties
      const errorProps: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        // Use Record<string, unknown> for type-safe dynamic property access
        errorProps[key] = (err as Record<string, unknown>)[key];
      }
      // Also check for details
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

  // Also log full error to console for debugging
  // eslint-disable-next-line no-console
  console.error(`${title}:`, err);
  // eslint-disable-next-line no-console
  console.error("Error details:", err.details);
  // eslint-disable-next-line no-console
  console.error("Full error keys:", Object.keys(err));
  // eslint-disable-next-line no-console
  console.error(
    "Full error own property names:",
    Object.getOwnPropertyNames(err)
  );
};

// One-Time Payment Story
const createOneTimePaymentForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>Braintree PayPal Checkout V6</h2>

      <div class="paypal-description">
        <p class="shared-description">
          Click the PayPal button below to pay with PayPal or a credit/debit card.
          This example demonstrates using updatePayment in onShippingAddressChange.
        </p>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="result" class="shared-result"></div>

      <div id="update-payment-section" style="display: none;">
        <div id="update-result" class="shared-result"></div>
      </div>
    </div>
  `;

  return container;
};

const setupOneTimePayment = async (container: HTMLElement): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const updateResultDiv = container.querySelector(
    "#update-result"
  ) as HTMLElement;

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
      amount: "10.00",
      currency: "USD",
      intent: "capture",

      onShippingAddressChange: function (data) {
        const isChicago = data.shippingAddress?.city === "Chicago";
        const shippingCost = isChicago ? 10.0 : 5.0;
        const itemTotal = 10.0;
        const newTotal = itemTotal + shippingCost;
        const currentOrderId = getOrderId(data);
        return paypalCheckoutV6Instance
          .updatePayment({
            paymentId: currentOrderId,
            amount: newTotal.toFixed(2),
            currency: "USD",
            lineItems: [
              {
                quantity: "1",
                unitAmount: itemTotal.toFixed(2),
                name: "Test Item",
                kind: "debit",
              },
            ],
            shippingOptions: [
              {
                id: "standard",
                label: "Standard Shipping",
                selected: !isChicago,
                type: "SHIPPING",
                amount: {
                  currency: "USD",
                  value: "5.00",
                },
              },
              {
                id: "chicago-express",
                label: "Chicago Express",
                selected: isChicago,
                type: "SHIPPING",
                amount: {
                  currency: "USD",
                  value: "10.00",
                },
              },
            ],
            amountBreakdown: {
              itemTotal: itemTotal.toFixed(2),
              shipping: shippingCost.toFixed(2),
              handling: "0.0",
              taxTotal: "0.0",
              insurance: "0.0",
              shippingDiscount: "0.0",
              discount: "0.0",
            },
          })
          .then(function (response) {
            const updatePaymentSection = document.querySelector(
              "#update-payment-section"
            );
            if (updatePaymentSection) {
              updatePaymentSection.style.display = "block";
            }
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--success";
            updateResultDiv.innerHTML = `
              <strong>Payment Updated</strong><br>
              <small>Applied ${isChicago ? "Chicago" : "standard"} shipping rate: $${shippingCost}</small><br>
              <small>New Total: $${newTotal.toFixed(2)}</small>
            `;

            return response;
          })
          .catch(function (error) {
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            updateResultDiv.innerHTML = `
              <strong>Update Failed:</strong> ${error.message}
            `;
          });
      },

      onApprove: async (data: IPayPalV6ApproveData) => {
        // Normalize data - PayPal V6 returns camelCase (payerId/orderId)
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
          <small>Amount: $10.00</small>
        `;
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

    // Render PayPal button
    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay with PayPal";
    button.className = "paypal-button";
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

    button.addEventListener("click", () => {
      session.start();
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

const setupRecurringBilling = async (container: HTMLElement): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const purchaseToggle = container.querySelector(
    "#vaultWithPurchaseToggle"
  ) as HTMLInputElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
    return;
  }

  const BILLING_AGREEMENT_WITHOUT_PURCHASE = {
    billingAgreementDescription: "Monthly subscription for premium service",
  };

  const BILLING_AGREEMENT_WITH_PURCHASE = {
    billingAgreementDescription: "Monthly subscription for premium service",
    planType: "SUBSCRIPTION",
    amount: "233.00",
    currency: "USD",
    planMetadata: {
      billingCycles: [
        {
          billingFrequency: "1",
          billingFrequencyUnit: "MONTH",
          numberOfExecutions: "3",
          sequence: "1",
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          trial: false,
          pricingScheme: {
            pricingModel: "FIXED",
            price: "200.00",
          },
        },
      ],
      currencyIsoCode: "USD",
      name: "Premium Subscription",
      productDescription: "Premium Service Plan",
      productQuantity: "1.0",
      oneTimeFeeAmount: "10",
      shippingAmount: "3.0",
      productPrice: "200",
      taxAmount: "20",
      totalAmount: "233.00",
    },
  };

  try {
    const braintree = getBraintreeSDK(resultDiv);
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });

    const paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
      client: clientInstance,
    });

    // Load the PayPal V6 SDK
    await paypalCheckoutV6Instance.loadPayPalSDK();

    const getSessionOptions = () => {
      const baseOptions = purchaseToggle.checked
        ? BILLING_AGREEMENT_WITH_PURCHASE
        : BILLING_AGREEMENT_WITHOUT_PURCHASE;

      return {
        ...baseOptions,
        onApprove: async (data: IPayPalV6ApproveData) => {
          const payload = await paypalCheckoutV6Instance.tokenizePayment({
            billingToken: data.billingToken,
          });

          const mode = purchaseToggle.checked
            ? "with purchase metadata"
            : "simple vault";
          const email =
            payload.details?.email || payload.details?.payerEmail || "N/A";

          resultDiv.className =
            "shared-result shared-result--visible shared-result--success";
          resultDiv.innerHTML = `
            <strong>Recurring billing agreement created ${mode}!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Payer Email: ${email}</small><br>
            <small>Mode: ${purchaseToggle.checked ? "Subscription with metadata" : "Simple vault"}</small>
          `;
        },

        onCancel: () => {
          resultDiv.className = "shared-result shared-result--visible";
          resultDiv.innerHTML = `
            <strong>Billing Agreement Cancelled</strong><br>
            <small>Customer cancelled the billing agreement flow.</small>
          `;
        },

        onError: (err: IBraintreeError) => {
          showDetailedError(resultDiv, "PayPal Error", err);
        },
      };
    };

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Create Billing Agreement";
    button.className = "paypal-button";
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

    button.addEventListener("click", () => {
      const session =
        paypalCheckoutV6Instance.createBillingAgreementSession(
          getSessionOptions()
        );
      session.start();
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

export const OneTimePayment: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = createOneTimePaymentForm();
      container.appendChild(formContainer);
      await setupOneTimePayment(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};

export const RecurringBillingAgreement: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const formContainer = document.createElement("div");
      formContainer.innerHTML = `
        <div class="shared-container paypal-container">
          <h2>PayPal V6 Recurring Billing Agreement</h2>

          <div class="paypal-description">
            <p class="shared-description">
              Create a recurring billing agreement with advanced subscription metadata.
            </p>

            <div class="paypal-form-group">
              <label class="paypal-checkbox-label">
                <input type="checkbox" id="vaultWithPurchaseToggle" class="paypal-checkbox" />
                <span class="paypal-checkbox-text">Include purchase transaction metadata</span>
              </label>
            </div>
          </div>

          <div id="paypal-button" class="paypal-button-container"></div>

          <div id="result" class="shared-result"></div>
        </div>
      `;

      container.appendChild(formContainer);
      await setupRecurringBilling(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};

const createLineItemsForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container" style="max-width: 600px;">
      <h2>PayPal V6 Line Items & Shipping</h2>

      <div class="paypal-description">
        <p class="shared-description">
          This example demonstrates complete line items configuration including multiple items,
          shipping costs, taxes, and discounts. Line items are passed at session creation and
          updated dynamically when shipping address changes.
        </p>
      </div>

      <div id="order-summary" class="order-summary" style="background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Order Summary</h3>
        <div id="line-items-display"></div>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
        <div id="order-totals"></div>
      </div>

      <div id="paypal-button" class="paypal-button-container"></div>

      <div id="update-payment-section" style="display: none; margin-top: 15px;">
        <div id="update-result" class="shared-result"></div>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

interface LineItem {
  quantity: string;
  unitAmount: string;
  name: string;
  kind: "debit" | "credit";
  unitTaxAmount?: string;
  description?: string;
}

interface AmountBreakdown {
  itemTotal: string;
  shipping: string;
  handling: string;
  taxTotal: string;
  insurance: string;
  shippingDiscount: string;
  discount: string;
}

interface ShippingOption {
  id: string;
  label: string;
  selected: boolean;
  type: "SHIPPING" | "PICKUP";
  amount: {
    currency: string;
    value: string;
  };
}

const SAMPLE_LINE_ITEMS: LineItem[] = [
  {
    quantity: "2",
    unitAmount: "25.00",
    name: "Premium Widget",
    kind: "debit",
    unitTaxAmount: "2.50",
    description: "High-quality widget with warranty",
  },
  {
    quantity: "1",
    unitAmount: "15.00",
    name: "Widget Accessory Pack",
    kind: "debit",
    unitTaxAmount: "1.50",
    description: "Essential accessories for your widget",
  },
  {
    quantity: "3",
    unitAmount: "5.00",
    name: "Widget Batteries",
    kind: "debit",
    unitTaxAmount: "0.50",
    description: "Long-lasting power cells",
  },
  {
    quantity: "1",
    unitAmount: "10.00",
    name: "Early Bird Discount",
    kind: "credit",
    description: "10% off promotional discount",
  },
];

const calculateOrderTotals = (
  items: LineItem[],
  shippingCost: number
): { itemTotal: number; taxTotal: number; discount: number; total: number } => {
  let itemTotal = 0;
  let taxTotal = 0;
  let discount = 0;

  items.forEach((item) => {
    const quantity = parseFloat(item.quantity);
    const unitAmount = parseFloat(item.unitAmount);
    const lineTotal = quantity * unitAmount;

    if (item.kind === "credit") {
      discount += lineTotal;
    } else {
      itemTotal += lineTotal;
      if (item.unitTaxAmount) {
        taxTotal += quantity * parseFloat(item.unitTaxAmount);
      }
    }
  });

  const total = itemTotal + taxTotal + shippingCost - discount;

  return { itemTotal, taxTotal, discount, total };
};

const renderOrderSummary = (
  container: HTMLElement,
  items: LineItem[],
  shippingCost: number,
  shippingLabel: string
): void => {
  const lineItemsDisplay = container.querySelector(
    "#line-items-display"
  ) as HTMLElement;
  const orderTotals = container.querySelector("#order-totals") as HTMLElement;

  const { itemTotal, taxTotal, discount, total } = calculateOrderTotals(
    items,
    shippingCost
  );

  let lineItemsHtml = "";
  items.forEach((item) => {
    const quantity = parseFloat(item.quantity);
    const unitAmount = parseFloat(item.unitAmount);
    const lineTotal = quantity * unitAmount;
    const isDiscount = item.kind === "credit";

    lineItemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; ${isDiscount ? "color: #28a745;" : ""}">
        <span>
          ${isDiscount ? "(-) " : ""}${item.name} ${quantity > 1 ? `x${quantity}` : ""}
          ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ""}
        </span>
        <span style="white-space: nowrap; margin-left: 10px;">
          ${isDiscount ? "-" : ""}$${lineTotal.toFixed(2)}
        </span>
      </div>
    `;
  });

  lineItemsDisplay.innerHTML = lineItemsHtml;

  orderTotals.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Subtotal:</span>
      <span>$${itemTotal.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Shipping (${shippingLabel}):</span>
      <span>$${shippingCost.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Tax:</span>
      <span>$${taxTotal.toFixed(2)}</span>
    </div>
    ${
      discount > 0
        ? `
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #28a745;">
      <span>Discount:</span>
      <span>-$${discount.toFixed(2)}</span>
    </div>
    `
        : ""
    }
    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; font-size: 18px;">
      <span>Total:</span>
      <span>$${total.toFixed(2)}</span>
    </div>
  `;
};

const setupLineItemsPayment = async (container: HTMLElement): Promise<void> => {
  const clientToken = await getClientToken();
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const updateResultDiv = container.querySelector(
    "#update-result"
  ) as HTMLElement;

  if (!clientToken) {
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";
    resultDiv.innerHTML = `
      <strong>Configuration Error</strong><br>
      <small>Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file</small>
    `;
    return;
  }

  const DEFAULT_SHIPPING_COST = 5.0;
  const DEFAULT_SHIPPING_LABEL = "Standard";

  renderOrderSummary(
    container,
    SAMPLE_LINE_ITEMS,
    DEFAULT_SHIPPING_COST,
    DEFAULT_SHIPPING_LABEL
  );

  try {
    const braintree = getBraintreeSDK(resultDiv);
    const clientInstance = await braintree.client.create({
      authorization: clientToken,
    });

    const paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
      client: clientInstance,
    });

    await paypalCheckoutV6Instance.loadPayPalSDK();

    const initialTotals = calculateOrderTotals(
      SAMPLE_LINE_ITEMS,
      DEFAULT_SHIPPING_COST
    );

    const getShippingOptions = (
      selectedId: string,
      currency: string
    ): ShippingOption[] => [
      {
        id: "standard",
        label: "Standard Shipping (5-7 days)",
        selected: selectedId === "standard",
        type: "SHIPPING",
        amount: { currency, value: "5.00" },
      },
      {
        id: "express",
        label: "Express Shipping (2-3 days)",
        selected: selectedId === "express",
        type: "SHIPPING",
        amount: { currency, value: "12.00" },
      },
      {
        id: "overnight",
        label: "Overnight Shipping",
        selected: selectedId === "overnight",
        type: "SHIPPING",
        amount: { currency, value: "25.00" },
      },
      {
        id: "pickup",
        label: "Store Pickup (Free)",
        selected: selectedId === "pickup",
        type: "PICKUP",
        amount: { currency, value: "0.00" },
      },
    ];

    const getAmountBreakdown = (
      items: LineItem[],
      shippingCost: number
    ): AmountBreakdown => {
      const { itemTotal, taxTotal, discount } = calculateOrderTotals(
        items,
        shippingCost
      );

      return {
        itemTotal: itemTotal.toFixed(2),
        shipping: shippingCost.toFixed(2),
        handling: "0.00",
        taxTotal: taxTotal.toFixed(2),
        insurance: "0.00",
        shippingDiscount: "0.00",
        discount: discount.toFixed(2),
      };
    };

    const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: initialTotals.total.toFixed(2),
      currency: "USD",
      intent: "capture",
      lineItems: SAMPLE_LINE_ITEMS,
      shippingOptions: getShippingOptions("standard", "USD"),
      amountBreakdown: getAmountBreakdown(
        SAMPLE_LINE_ITEMS,
        DEFAULT_SHIPPING_COST
      ),

      onShippingAddressChange: function (data) {
        const city = data.shippingAddress?.city || "";
        const state = data.shippingAddress?.state || "";

        let selectedShippingId = "standard";
        let shippingCost = 5.0;
        let shippingLabel = "Standard";

        if (city.toLowerCase() === "chicago" || state.toLowerCase() === "il") {
          selectedShippingId = "express";
          shippingCost = 12.0;
          shippingLabel = "Express (IL)";
        } else if (
          city.toLowerCase() === "new york" ||
          state.toLowerCase() === "ny"
        ) {
          selectedShippingId = "overnight";
          shippingCost = 25.0;
          shippingLabel = "Overnight (NY)";
        } else if (
          city.toLowerCase() === "los angeles" ||
          state.toLowerCase() === "ca"
        ) {
          selectedShippingId = "pickup";
          shippingCost = 0.0;
          shippingLabel = "Store Pickup (CA)";
        }

        const newTotals = calculateOrderTotals(SAMPLE_LINE_ITEMS, shippingCost);

        renderOrderSummary(
          container,
          SAMPLE_LINE_ITEMS,
          shippingCost,
          shippingLabel
        );

        const currentOrderId = getOrderId(data);

        return paypalCheckoutV6Instance
          .updatePayment({
            paymentId: currentOrderId,
            amount: newTotals.total.toFixed(2),
            currency: "USD",
            lineItems: SAMPLE_LINE_ITEMS,
            shippingOptions: getShippingOptions(selectedShippingId, "USD"),
            amountBreakdown: getAmountBreakdown(
              SAMPLE_LINE_ITEMS,
              shippingCost
            ),
          })
          .then(function (response) {
            const updatePaymentSection = document.querySelector(
              "#update-payment-section"
            );
            if (updatePaymentSection) {
              (updatePaymentSection as HTMLElement).style.display = "block";
            }
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--success";
            updateResultDiv.innerHTML = `
              <strong>Payment Updated</strong><br>
              <small>Shipping: ${shippingLabel} ($${shippingCost.toFixed(2)})</small><br>
              <small>New Total: $${newTotals.total.toFixed(2)}</small><br>
              <small>Location: ${city || "Unknown"}, ${state || "Unknown"}</small>
            `;

            return response;
          })
          .catch(function (error) {
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            updateResultDiv.innerHTML = `
              <strong>Update Failed:</strong> ${error.message}
            `;
          });
      },

      onShippingOptionsChange: function (data) {
        const selectedOption = data.selectedShippingOption;
        const shippingCost = selectedOption
          ? parseFloat(selectedOption.amount.value)
          : DEFAULT_SHIPPING_COST;
        const shippingLabel = selectedOption
          ? selectedOption.label
          : DEFAULT_SHIPPING_LABEL;

        const newTotals = calculateOrderTotals(SAMPLE_LINE_ITEMS, shippingCost);

        renderOrderSummary(
          container,
          SAMPLE_LINE_ITEMS,
          shippingCost,
          shippingLabel
        );

        const currentOrderId = getOrderId(data);
        const selectedId = selectedOption?.id || "standard";

        return paypalCheckoutV6Instance
          .updatePayment({
            paymentId: currentOrderId,
            amount: newTotals.total.toFixed(2),
            currency: "USD",
            lineItems: SAMPLE_LINE_ITEMS,
            shippingOptions: getShippingOptions(selectedId, "USD"),
            amountBreakdown: getAmountBreakdown(
              SAMPLE_LINE_ITEMS,
              shippingCost
            ),
          })
          .then(function (response) {
            const updatePaymentSection = document.querySelector(
              "#update-payment-section"
            );
            if (updatePaymentSection) {
              (updatePaymentSection as HTMLElement).style.display = "block";
            }
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--success";
            updateResultDiv.innerHTML = `
              <strong>Shipping Updated</strong><br>
              <small>Selected: ${shippingLabel}</small><br>
              <small>Cost: $${shippingCost.toFixed(2)}</small><br>
              <small>New Total: $${newTotals.total.toFixed(2)}</small>
            `;

            return response;
          })
          .catch(function (error) {
            updateResultDiv.className =
              "shared-result shared-result--visible shared-result--error";
            updateResultDiv.innerHTML = `
              <strong>Update Failed:</strong> ${error.message}
            `;
          });
      },

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
          <small>Line Items: ${SAMPLE_LINE_ITEMS.length} items processed</small><br>
          <small>Includes: shipping, tax, and discount</small>
        `;
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

    const paypalButtonContainer = container.querySelector(
      "#paypal-button"
    ) as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Pay with PayPal";
    button.className = "paypal-button";
    button.id = "line-items-pay-button";
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

    button.addEventListener("click", () => {
      session.start();
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

export const LineItemsAndShipping: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createLineItemsForm();
      container.appendChild(formContainer);
      setupLineItemsPayment(formContainer);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
