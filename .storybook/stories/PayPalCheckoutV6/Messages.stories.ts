import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import { getBraintreeSDK } from "../../utils/braintree-sdk";
import { showSimpleError } from "./common";
import "../../css/main.css";
import "../PayPalCheckout/payPalCheckout.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6/Messages",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
PayPal Messages Component - Display promotional messaging about Pay Later options, installment plans, and PayPal Credit.

**Key Features:**
- Pay Later promotional messaging
- Installment plan information
- PayPal Credit awareness
- Dynamic messaging based on amount
- Multiple placement types (product, cart, home, category)

**Use Cases:**
- Product detail pages: Show Pay Later messaging near price
- Cart pages: Display financing options based on cart total
- Category pages: Promote financing availability
- Homepage: General PayPal Credit awareness

**How It Works:**
1. Load the PayPal SDK via \`loadPayPalSDK()\`
2. Use \`createMessages()\` to create a messages instance
3. Call \`messagesInstance.fetchContent()\` to get the message markup
4. Pass the fetched content to \`messageEl.setContent(...)\` to display the messages

**Benefits of createMessages():**
- Automatic SDK instance management with correct components
- Instance reuse for multiple messages
- Built-in analytics and error handling
- Simple, consistent API
        `,
      },
    },
  },
};

export default meta;

/**
 * Arguments for Messages story
 */
interface MessagesArgs {
  amount?: number;
  placement?: string;
  layout?: string;
}

/**
 * PayPal Messages content structure
 */
interface PayPalMessagesContent {
  messageItems?: {
    mainItems?: Array<unknown>;
    actionItems?: Array<unknown>;
  };
  update?: (_options: { amount: string }) => void;
  [key: string]: unknown;
}

/**
 * Shared args configuration for Messages stories
 */
const messagesArgs = {
  amount: 99.99,
  placement: "product",
  layout: "text",
};

const messagesArgTypes = {
  amount: {
    control: { type: "number" as const, min: 30, max: 10000, step: 0.01 },
    description: "Amount to display in messages",
  },
  placement: {
    control: { type: "select" as const },
    options: ["product", "cart", "home", "category"],
    description: "Placement type for the messages",
  },
  layout: {
    control: { type: "select" as const },
    options: ["text", "flex", "custom"],
    description: "Layout style for the messages",
  },
};

/**
 * Initialize PayPal V6 instance and load SDK
 * Returns null if client token is missing (error is displayed in resultDiv)
 */
const initializePayPal = async (
  resultDiv: HTMLElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> => {
  const clientToken = await getClientToken();

  if (!clientToken) {
    showSimpleError(
      resultDiv,
      "Configuration Error",
      "Please add STORYBOOK_BRAINTREE_CLIENT_TOKEN to your .env file"
    );
    return null;
  }

  const braintree = getBraintreeSDK(resultDiv);
  const clientInstance = await braintree.client.create({
    authorization: clientToken,
  });

  const paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
    client: clientInstance,
  });

  await paypalCheckoutV6Instance.loadPayPalSDK();

  return paypalCheckoutV6Instance;
};

const createMessagesForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container paypal-container">
      <h2>PayPal Messages Component</h2>

      <div class="paypal-description">
        <p class="shared-description">
          PayPal Messages display promotional content about Pay Later options and financing.
          The messages update dynamically based on the amount shown.
        </p>
      </div>

      <div class="product-example" style="max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="margin-top: 0;">Example Product</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <span id="product-price" style="font-size: 24px; font-weight: bold;">$99.99</span>
          <div>
            <button id="decrease-qty" style="padding: 5px 10px; margin-right: 5px;">-</button>
            <span id="quantity">1</span>
            <button id="increase-qty" style="padding: 5px 10px; margin-left: 5px;">+</button>
          </div>
        </div>

        <!-- PayPal Message web component -->
        <paypal-message id="paypal-message" style="margin: 15px 0;"></paypal-message>

        <button id="add-to-cart-button" style="width: 100%; padding: 12px; background-color: #0070ba; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 10px;">
          Add to Cart
        </button>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupMessages = async (
  container: HTMLElement,
  args?: MessagesArgs
): Promise<void> => {
  const resultDiv = container.querySelector("#result") as HTMLElement;

  try {
    const paypalCheckoutV6Instance = await initializePayPal(resultDiv);
    if (!paypalCheckoutV6Instance) return; // Error already displayed

    // Get the message element

    const messageEl = container.querySelector(
      "#paypal-message"
    ) as HTMLElement & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setContent: (_content: any) => void;
    };
    const priceEl = container.querySelector("#product-price") as HTMLElement;
    const quantityEl = container.querySelector("#quantity") as HTMLElement;
    const increaseBtn = container.querySelector(
      "#increase-qty"
    ) as HTMLButtonElement;
    const decreaseBtn = container.querySelector(
      "#decrease-qty"
    ) as HTMLButtonElement;

    // Use createMessages() to get a messages instance
    const baseAmount = args?.amount || 99.99;
    const placement = args?.placement || "product";
    const layout = args?.layout || "text";

    // Set logo type and text color based on layout
    let logoType = "INLINE";
    const textColor = "MONOCHROME";

    if (layout === "flex") {
      logoType = "PRIMARY";
    }

    const messagesInstance = await paypalCheckoutV6Instance.createMessages({
      buyerCountry: "US",
      currencyCode: "USD",
    });

    let quantity = 1;
    let currentContent: PayPalMessagesContent | null = null;

    // Initial fetch and render
    const updateMessages = async (amount: number) => {
      if (currentContent) {
        // Update existing content
        currentContent.update?.({ amount: String(amount) });
        priceEl.textContent = `$${amount.toFixed(2)}`;
        quantityEl.textContent = String(quantity);
        return;
      }

      // Initial fetch - PayPal SDK doesn't throw errors, it returns empty content
      // Pass configuration directly to fetchContent() instead of using web component attributes
      const content = (await messagesInstance.fetchContent({
        amount: String(amount),
        placement: placement,
        style: {
          layout: layout,
        },
        logoType: logoType,
        textColor: textColor,
        onReady: (_content: PayPalMessagesContent) => {
          messageEl.setContent(_content);
        },
      })) as PayPalMessagesContent;
      // eslint-disable-next-line require-atomic-updates
      currentContent = content;

      // Check if content is empty (indicates an error occurred)
      const messageItems = content.messageItems;
      const hasContent =
        messageItems &&
        ((messageItems.mainItems?.length ?? 0) > 0 ||
          (messageItems.actionItems?.length ?? 0) > 0);

      if (!hasContent) {
        resultDiv.className =
          "shared-result shared-result--visible shared-result--error";

        resultDiv.innerHTML = `
          <strong>Error Loading Messages</strong><br>
          <small>
            The PayPal API returned empty content. This is likely due to missing PayPal API scopes.<br><br>
            <strong>Required scopes:</strong><br>
            • <code>https://uri.paypal.com/services/credit/offer-presentment/read</code><br>
            • <code>https://uri.paypal.com/services/credit/client-offer-presentment/read</code><br><br>
            Check the browser console for the API response (likely 403 Forbidden).
          </small>
        `;
        return;
      }

      priceEl.textContent = `$${amount.toFixed(2)}`;
      quantityEl.textContent = String(quantity);

      // Show success message
      resultDiv.className = "shared-result shared-result--visible";
      resultDiv.innerHTML = `
        <strong>Messages Component Created</strong><br>
        <small>Use the +/- buttons to see dynamic updates</small>
      `;
    };

    await updateMessages(baseAmount);

    // Handle quantity changes
    increaseBtn.addEventListener("click", async () => {
      quantity += 1;
      await updateMessages(baseAmount * quantity);
    });

    decreaseBtn.addEventListener("click", async () => {
      if (quantity > 1) {
        quantity -= 1;
        await updateMessages(baseAmount * quantity);
      }
    });
  } catch (error) {
    const err = error as Error;

    // eslint-disable-next-line require-atomic-updates
    resultDiv.className =
      "shared-result shared-result--visible shared-result--error";

    // eslint-disable-next-line require-atomic-updates
    resultDiv.innerHTML = `
      <strong>Error</strong><br>
      <small>${err.message}</small>
    `;
  }
};

/**
 * Programmatic PayPal Messages
 *
 * This example shows PayPal promotional messages using the createMessages() API.
 * Messages display Pay Later options and financing information based on the amount.
 * Use the controls to adjust placement, layout, and amount to see how messages adapt.
 */
export const Programmatic: StoryObj = {
  args: messagesArgs,
  argTypes: messagesArgTypes,
  render: createSimpleBraintreeStory(
    async (container, args) => {
      // Create the form HTML
      const formHTML = createMessagesForm();
      container.appendChild(formHTML);

      // Set up the messages
      await setupMessages(container, args as MessagesArgs);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};

/**
 * Auto-Bootstrap PayPal Messages
 *
 * This example shows the simplest way to use PayPal Messages using the auto-bootstrap attribute.
 * No JavaScript needed - just load the PayPal SDK and add the web component to your HTML.
 * The messages will automatically render based on the attributes provided.
 */
export const AutoBootstrap: StoryObj = {
  args: messagesArgs,
  argTypes: messagesArgTypes,
  render: createSimpleBraintreeStory(
    async (container, args) => {
      const amount = (args?.amount as number) || 99.99;
      const placement = (args?.placement as string) || "product";
      const layout = (args?.layout as string) || "text";

      const logoType = layout === "flex" ? "PRIMARY" : "INLINE";
      const textColor = "MONOCHROME";

      // Create simple auto-bootstrap example
      const autoBootstrapContainer = document.createElement("div");
      autoBootstrapContainer.innerHTML = `
        <div class="shared-container paypal-container">
          <h2>Auto-Bootstrap PayPal Messages</h2>

          <div class="paypal-description">
            <p class="shared-description">
              This example uses <code>auto-bootstrap</code> for the simplest integration.
              The messages render automatically without any JavaScript code.
            </p>
          </div>

          <div class="product-example" style="max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h3 style="margin-top: 0;">Example Product</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <span style="font-size: 24px; font-weight: bold;">$${amount.toFixed(2)}</span>
            </div>

            <!-- Auto-bootstrap PayPal Message -->
            <paypal-message
              auto-bootstrap
              amount="${amount}"
              currency-code="USD"
              data-pp-placement="${placement}"
              data-pp-style-layout="${layout}"
              logo-type="${logoType}"
              text-color="${textColor}"
            ></paypal-message>
          </div>

          <div class="shared-result shared-result--visible">
            <strong>HTML Code:</strong>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>&lt;paypal-message
  auto-bootstrap
  amount="${amount}"
  currency-code="USD"
  data-pp-placement="${placement}"
  data-pp-style-layout="${layout}"
  logo-type="${logoType}"
  text-color="${textColor}"
&gt;&lt;/paypal-message&gt;</code></pre>
          </div>
        </div>
      `;

      container.appendChild(autoBootstrapContainer);

      // Load PayPal SDK for auto-bootstrap
      const resultDiv = container.querySelector(
        ".shared-result"
      ) as HTMLElement;
      await initializePayPal(resultDiv);
      // SDK loaded by initializePayPal helper
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
