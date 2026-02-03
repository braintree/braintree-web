import { $, expect } from "@wdio/globals";
import { getWorkflowUrl } from "../helpers/url-utils";
import {
  getPayPalBuyerCredentials,
  switchToPayPalPopup,
  switchToOriginalWindow,
  completePayPalLogin,
  approvePayPalPayment,
  waitForPopupToClose,
  cancelPayPalPayment,
  closePayPalPopup,
  completePayPalCheckoutFlow,
} from "../helpers/paypal/checkout-helpers";
import { getResultContainerState } from "./helpers";
import { TEST_TIMEOUTS, STORY_URLS } from "./constants";

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

interface CreatePaymentPayload {
  amount: string;
  currencyIsoCode: string;
  lineItems?: LineItem[];
  shippingOptions?: unknown[];
  amountBreakdown?: AmountBreakdown;
}

const EXPECTED_LINE_ITEMS: LineItem[] = [
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

describe("PayPal Checkout V6", function () {
  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: TEST_TIMEOUTS.pageLoad,
    });
  });

  describe("Button Rendering", function () {
    it("should render PayPal button correctly", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.oneTimePayment));

      await browser.waitForPayPalButtonReady();

      const paypalButton = $(".paypal-button");
      const isDisplayed = await paypalButton.isDisplayed();
      const isClickable = await paypalButton.isClickable();

      expect(isDisplayed).toBe(true);
      expect(isClickable).toBe(true);
    });
  });

  describe("Complete Checkout", function () {
    it("should complete PayPal payment successfully", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.oneTimePayment));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      const originalWindow = await switchToPayPalPopup();

      await completePayPalLogin();
      await approvePayPalPayment();
      await waitForPopupToClose();
      await switchToOriginalWindow(originalWindow);

      const paypalResult = await browser.getPayPalResult();

      expect(paypalResult.success).toBe(true);
      expect(paypalResult.text).toContain("PayPal payment authorized!");
      expect(paypalResult.text).toContain("Nonce:");
      expect(paypalResult.text).toContain("Payer Email:");
    });
  });

  describe("Cancel Flow", function () {
    it("should handle customer cancellation during PayPal authentication", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.oneTimePayment));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      const originalWindow = await switchToPayPalPopup();

      await completePayPalLogin();
      await cancelPayPalPayment();
      await switchToOriginalWindow(originalWindow);

      const paypalResult = await browser.getPayPalResult();

      expect(paypalResult.cancelled).toBe(true);
      expect(paypalResult.text).toContain("Payment Cancelled");
    });
  });

  describe("Popup Handling", function () {
    it("should handle popup being closed manually", async function () {
      getPayPalBuyerCredentials();

      await browser.url(getWorkflowUrl(STORY_URLS.oneTimePayment));
      await browser.waitForPayPalButtonReady();
      await browser.clickPayPalButton();

      const originalWindow = await switchToPayPalPopup();

      await browser.closeWindow();
      await browser.switchToWindow(originalWindow);

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const { isVisible, resultText } = await getResultContainerState();

      if (isVisible) {
        const containsCancel =
          resultText.includes("Cancelled") || resultText.includes("cancelled");

        expect(containsCancel).toBe(true);
      }
    });
  });

  describe("Line Items and Shipping - SDK Payload Verification", function () {
    it("should send line items to create_payment_resource API", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.lineItemsAndShipping));
      await browser.setupInterceptor();
      await browser.waitForPayPalButtonReady();

      const originalWindowHandle = await browser.getWindowHandle();

      await browser.clickPayPalButton();

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const requests = await browser.getRequests();
      const createPaymentRequest = requests.find((r) =>
        r.url.includes("create_payment_resource")
      );

      expect(createPaymentRequest).toBeDefined();

      const payload = createPaymentRequest?.body as CreatePaymentPayload;

      expect(payload.lineItems).toBeDefined();
      expect(payload.lineItems?.length).toBe(EXPECTED_LINE_ITEMS.length);

      const premiumWidget = payload.lineItems?.find(
        (item) => item.name === "Premium Widget"
      );
      expect(premiumWidget).toBeDefined();
      expect(premiumWidget?.quantity).toBe("2");
      expect(premiumWidget?.unitAmount).toBe("25.00");
      expect(premiumWidget?.kind).toBe("debit");
      expect(premiumWidget?.unitTaxAmount).toBe("2.50");

      const discountItem = payload.lineItems?.find(
        (item) => item.kind === "credit"
      );
      expect(discountItem).toBeDefined();
      expect(discountItem?.name).toBe("Early Bird Discount");
      expect(discountItem?.unitAmount).toBe("10.00");

      await closePayPalPopup(originalWindowHandle);
    });

    it("should send shipping options to create_payment_resource API", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.lineItemsAndShipping));
      await browser.setupInterceptor();
      await browser.waitForPayPalButtonReady();

      const originalWindowHandle = await browser.getWindowHandle();

      await browser.clickPayPalButton();

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const requests = await browser.getRequests();
      const createPaymentRequest = requests.find((r) =>
        r.url.includes("create_payment_resource")
      );

      expect(createPaymentRequest).toBeDefined();

      const payload = createPaymentRequest?.body as CreatePaymentPayload;

      expect(payload.shippingOptions).toBeDefined();
      expect(Array.isArray(payload.shippingOptions)).toBe(true);
      expect(payload.shippingOptions?.length).toBeGreaterThan(0);

      await closePayPalPopup(originalWindowHandle);
    });

    it("should send amount breakdown to create_payment_resource API", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.lineItemsAndShipping));
      await browser.setupInterceptor();
      await browser.waitForPayPalButtonReady();

      const originalWindowHandle = await browser.getWindowHandle();

      await browser.clickPayPalButton();

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const requests = await browser.getRequests();
      const createPaymentRequest = requests.find((r) =>
        r.url.includes("create_payment_resource")
      );

      expect(createPaymentRequest).toBeDefined();

      const payload = createPaymentRequest?.body as CreatePaymentPayload;

      expect(payload.amountBreakdown).toBeDefined();
      expect(payload.amountBreakdown?.itemTotal).toBe("80.00");
      expect(payload.amountBreakdown?.shipping).toBe("5.00");
      expect(payload.amountBreakdown?.taxTotal).toBe("8.00");
      expect(payload.amountBreakdown?.discount).toBe("10.00");

      await closePayPalPopup(originalWindowHandle);
    });

    it("should send correct total amount matching breakdown", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.lineItemsAndShipping));
      await browser.setupInterceptor();
      await browser.waitForPayPalButtonReady();

      const originalWindowHandle = await browser.getWindowHandle();

      await browser.clickPayPalButton();

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const requests = await browser.getRequests();
      const createPaymentRequest = requests.find((r) =>
        r.url.includes("create_payment_resource")
      );

      expect(createPaymentRequest).toBeDefined();

      const payload = createPaymentRequest?.body as CreatePaymentPayload;

      expect(payload.amount).toBe("83.00");
      expect(payload.currencyIsoCode).toBe("USD");

      await closePayPalPopup(originalWindowHandle);
    });

    it("should complete payment with line items and receive nonce", async function () {
      await browser.url(getWorkflowUrl(STORY_URLS.lineItemsAndShipping));
      await browser.setupInterceptor();
      await browser.waitForPayPalButtonReady();

      await browser.clickPayPalButton();

      await browser.pause(TEST_TIMEOUTS.callbackDelay);

      const requests = await browser.getRequests();
      const createPaymentRequest = requests.find((r) =>
        r.url.includes("create_payment_resource")
      );
      expect(createPaymentRequest).toBeDefined();

      await completePayPalCheckoutFlow();

      const paypalResult = await browser.getPayPalResult();

      expect(paypalResult.success).toBe(true);
      expect(paypalResult.text).toContain("PayPal payment authorized!");
      expect(paypalResult.text).toContain("Nonce:");
    });
  });
});
