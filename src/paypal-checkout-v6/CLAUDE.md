# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PayPal Checkout V6 integrates with the [PayPal Web SDK v6](https://developer.paypal.com/docs/checkout/) to provide a session-based PayPal payment experience. This component is designed for the newer PayPal V6 SDK architecture and differs significantly from the older `paypal-checkout` component.

**Key Features:**

- Integration with PayPal Web SDK v6 (not checkout.js)
- Session-based API pattern (`createOneTimePaymentSession`, `createBillingAgreementSession`)
- Dynamic SDK loading via `loadPayPalSDK()`
- Checkout flow (one-time payments)
- Vault flow (billing agreements for subscriptions)
- PayPal Credit support
- Pay Later (BNPL) support with eligibility checking
- Multiple presentation modes (popup, modal, redirect, app-switch)
- Plan metadata for recurring billing
- Payment method eligibility checking via `findEligibleMethods()`

**Critical Difference from paypal-checkout:** This component requires **client tokens only**. Tokenization keys are NOT supported.

## Component Structure

### Files

- `index.js` - Component entry point with `create()` and `isSupported()` functions
- `paypal-checkout-v6.js` - Main `PayPalCheckoutV6` class with all payment methods
- `constants.js` - SDK URLs, environment mappings, and analytics event names
- `errors.js` - Error codes and messages

## Integration Architecture

### SDK Loading

Unlike `paypal-checkout`, this component provides a method to dynamically load the PayPal SDK:

```javascript
paypalCheckoutV6Instance.loadPayPalSDK().then(function () {
  // PayPal V6 SDK is now loaded
});
```

**SDK URLs (from `constants.js`):**

- Production: `https://www.paypal.com/web-sdk/v6/core`
- Sandbox: `https://www.sandbox.paypal.com/web-sdk/v6/core`
- Stage: `https://www.msmaster.qa.paypal.com/web-sdk/v6/core`
- teBraintree: `https://www.braintree.stage.paypal.com/web-sdk/v6/core`

### PayPal Instance Creation

V6 uses `window.paypal.createInstance()` with the client token to create a PayPal instance:

```javascript
// Internal method - uses different components for checkout vs vault
this._createPayPalInstance({ flow: "vault" }); // Uses 'paypal-billing-agreements'
this._createPayPalInstance(); // Uses 'paypal-payments'
```

### Integration Flow

```
1. Create Braintree Client (with client token)
   ↓
2. Create PayPalCheckoutV6 instance
   ↓
3. Load PayPal SDK via loadPayPalSDK()
   ↓
4. Create payment session (one-time or billing agreement)
   ↓
5. Call session.start() on user interaction
   ↓
6. PayPal SDK shows approval flow
   ↓
7. onApprove callback receives approval data
   ↓
8. Tokenize payment with tokenizePayment()
   ↓
9. Send nonce to server
```

## Eligibility Checking

### findEligibleMethods()

The `findEligibleMethods()` API allows merchants to check which payment methods are eligible for a transaction before rendering buttons. This enables:

- Conditional rendering of PayPal, Pay Later, and PayPal Credit buttons
- Dynamic UI that shows only eligible payment options
- Pay Later promotional messaging based on eligibility
- Better user experience by not showing unavailable options

Eligibility depends on: currency, amount, merchant configuration, buyer location, and PayPal account features.

**Prerequisites:** Must call `loadPayPalSDK()` before using this method.

```javascript
paypalCheckoutV6Instance
  .findEligibleMethods({
    amount: "10.00",
    currency: "USD",
  })
  .then(function (eligibility) {
    if (eligibility.paylater) {
      // Show Pay Later button
      document.getElementById("paylater-button").style.display = "block";
    }
    if (eligibility.credit) {
      // Show PayPal Credit button
      document.getElementById("credit-button").style.display = "block";
    }
    if (eligibility.paypal) {
      // Show standard PayPal button
      document.getElementById("paypal-button").style.display = "block";
    }
  })
  .catch(function (err) {
    console.error("Eligibility check failed:", err);
  });
```

**findEligibleMethods Options:**

| Option     | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| `amount`   | string | Yes      | Payment amount (e.g., '10.00') |
| `currency` | string | Yes      | Currency code (e.g., 'USD')    |

**Eligibility Result:**

| Property   | Type    | Description                                   |
| ---------- | ------- | --------------------------------------------- |
| `paypal`   | boolean | Whether standard PayPal payments are eligible |
| `paylater` | boolean | Whether Pay Later (BNPL) is eligible          |
| `credit`   | boolean | Whether PayPal Credit is eligible             |

## Payment Flows

### 1. One-Time Payment (Checkout Flow)

**Use Case:** Single purchase transactions

```javascript
braintree.client
  .create({
    authorization: "CLIENT_TOKEN", // Must be client token, not tokenization key
  })
  .then(function (clientInstance) {
    return braintree.paypalCheckoutV6.create({
      client: clientInstance,
    });
  })
  .then(function (paypalCheckoutV6Instance) {
    return paypalCheckoutV6Instance.loadPayPalSDK();
  })
  .then(function (paypalCheckoutV6Instance) {
    var session = paypalCheckoutV6Instance.createOneTimePaymentSession({
      amount: "10.00",
      currency: "USD",
      intent: "capture",

      onApprove: function (data) {
        return paypalCheckoutV6Instance
          .tokenizePayment(data)
          .then(function (payload) {
            // Send payload.nonce to server
          });
      },

      onCancel: function () {
        console.log("Payment canceled");
      },

      onError: function (err) {
        console.error("Payment error:", err);
      },
    });

    document
      .getElementById("paypal-button")
      .addEventListener("click", function () {
        session.start();
      });
  });
```

**createOneTimePaymentSession Options:**

| Option                    | Type     | Required | Description                                                                  |
| ------------------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `amount`                  | string   | Yes      | Payment amount (e.g., '10.00')                                               |
| `currency`                | string   | Yes      | Currency code (e.g., 'USD')                                                  |
| `onApprove`               | function | Yes      | Called when customer approves payment                                        |
| `intent`                  | string   | No       | 'capture' (default), 'authorize', or 'order'                                 |
| `offerCredit`             | boolean  | No       | Offer PayPal Credit                                                          |
| `lineItems`               | array    | No       | Line items for transaction                                                   |
| `shippingOptions`         | array    | No       | Shipping options                                                             |
| `amountBreakdown`         | object   | No       | Breakdown of amount                                                          |
| `returnUrl`               | string   | No\*     | Return URL (required for app-switch)                                         |
| `cancelUrl`               | string   | No\*     | Cancel URL (required for app-switch)                                         |
| `presentationMode`        | string   | No       | 'auto', 'popup', 'modal', 'redirect', 'payment-handler', 'direct-app-switch' |
| `onCancel`                | function | No       | Called when customer cancels                                                 |
| `onError`                 | function | No       | Called on error                                                              |
| `onShippingAddressChange` | function | No       | Called when shipping address changes                                         |

### 2. Billing Agreement (Vault Flow)

**Use Case:** Save PayPal account for recurring payments/subscriptions

```javascript
var session = paypalCheckoutV6Instance.createBillingAgreementSession({
  billingAgreementDescription: "Monthly subscription",
  planType: "SUBSCRIPTION",
  planMetadata: {
    name: "Premium Plan",
    currencyIsoCode: "USD",
    billingCycles: [
      {
        billingFrequency: 1,
        billingFrequencyUnit: "MONTH",
        numberOfExecutions: 12,
        sequence: 1,
        trial: false,
        pricingScheme: {
          pricingModel: "FIXED",
          price: "29.99",
        },
      },
    ],
  },

  onApprove: function (data) {
    return paypalCheckoutV6Instance
      .tokenizePayment(data)
      .then(function (payload) {
        // Send payload.nonce to server for vaulting
      });
  },
});

session.start();
```

**createBillingAgreementSession Options:**

| Option                        | Type     | Required | Description                                                          |
| ----------------------------- | -------- | -------- | -------------------------------------------------------------------- |
| `onApprove`                   | function | Yes      | Called when customer approves                                        |
| `billingAgreementDescription` | string   | No       | Description shown to customer                                        |
| `planType`                    | string   | No       | 'UNSCHEDULED' (default), 'RECURRING', 'SUBSCRIPTION', 'INSTALLMENTS' |
| `planMetadata`                | object   | No       | Plan details with billing cycles                                     |
| `amount`                      | string   | No       | For vault-with-purchase flow                                         |
| `currency`                    | string   | No       | For vault-with-purchase flow                                         |
| `offerCredit`                 | boolean  | No       | Offer PayPal Credit                                                  |
| `shippingAddressOverride`     | object   | No       | Override shipping address                                            |
| `userAction`                  | string   | No       | 'CONTINUE', 'COMMIT', or 'SETUP_NOW'                                 |
| `returnUrl`                   | string   | No\*     | Required for app-switch                                              |
| `cancelUrl`                   | string   | No\*     | Required for app-switch                                              |
| `presentationMode`            | string   | No       | Presentation mode                                                    |
| `onCancel`                    | function | No       | Called on cancel                                                     |
| `onError`                     | function | No       | Called on error                                                      |

### 3. Legacy createPayment API

For compatibility, this component also supports `createPayment()` which returns order IDs or billing tokens:

```javascript
// Checkout flow
paypalCheckoutV6Instance
  .createPayment({
    flow: "checkout",
    amount: "10.00",
    currency: "USD",
    intent: "capture",
  })
  .then(function (orderId) {
    console.log("Order ID:", orderId);
  });

// Vault flow
paypalCheckoutV6Instance
  .createPayment({
    flow: "vault",
    planType: "SUBSCRIPTION",
    planMetadata: {
      /* ... */
    },
  })
  .then(function (billingToken) {
    console.log("Billing Token:", billingToken);
  });
```

## App Switch Flow

For mobile applications, V6 supports direct app switch to the PayPal app:

```javascript
var session = paypalCheckoutV6Instance.createOneTimePaymentSession({
  amount: "10.00",
  currency: "USD",
  returnUrl: "https://example.com/return", // Required for app switch
  cancelUrl: "https://example.com/cancel", // Required for app switch
  onApprove: function (data) {
    return paypalCheckoutV6Instance.tokenizePayment(data);
  },
});

// Check if returning from app switch
if (session.hasReturned()) {
  session.resume();
} else {
  document
    .getElementById("pay-button")
    .addEventListener("click", async function () {
      var result = await session.start({
        presentationMode: "direct-app-switch",
        autoRedirect: { enabled: true },
      });

      if (result.redirectURL) {
        window.location.assign(result.redirectURL);
      }
    });
}
```

## Payment Updates

Update payment details during checkout (e.g., when shipping changes):

```javascript
var session = paypalCheckoutV6Instance.createOneTimePaymentSession({
  amount: "10.00",
  currency: "USD",
  shippingOptions: [
    {
      id: "economy",
      label: "Economy",
      selected: true,
      amount: { currency: "USD", value: "0.00" },
    },
    {
      id: "express",
      label: "Express",
      selected: false,
      amount: { currency: "USD", value: "5.00" },
    },
  ],

  onShippingAddressChange: function (data) {
    var newTotal = calculateNewTotal(data.selectedShippingOption);

    return paypalCheckoutV6Instance.updatePayment({
      paymentId: data.orderId,
      amount: newTotal,
      currency: "USD",
      shippingOptions: [
        /* updated options */
      ],
      amountBreakdown: {
        itemTotal: "10.00",
        shipping: newShippingCost,
      },
    });
  },

  onApprove: function (data) {
    return paypalCheckoutV6Instance.tokenizePayment(data);
  },
});
```

## Error Handling

### Error Categories

**Configuration/Setup Errors (MERCHANT):**

| Code                                                | Description                                   |
| --------------------------------------------------- | --------------------------------------------- |
| `PAYPAL_CHECKOUT_V6_NOT_ENABLED`                    | PayPal not enabled in Braintree control panel |
| `PAYPAL_CHECKOUT_V6_SANDBOX_ACCOUNT_NOT_LINKED`     | Sandbox account not linked                    |
| `PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED` | Must use client token, not tokenization key   |

**SDK Loading Errors (NETWORK):**

| Code                                           | Description                      |
| ---------------------------------------------- | -------------------------------- |
| `PAYPAL_CHECKOUT_V6_SDK_SCRIPT_LOAD_FAILED`    | Failed to load PayPal V6 SDK     |
| `PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED` | Failed to create PayPal instance |

**Session Errors:**

| Code                                          | Type     | Description                                |
| --------------------------------------------- | -------- | ------------------------------------------ |
| `PAYPAL_CHECKOUT_V6_SESSION_CREATION_FAILED`  | MERCHANT | Failed to create session                   |
| `PAYPAL_CHECKOUT_V6_INVALID_SESSION_OPTIONS`  | MERCHANT | Missing required options                   |
| `PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED` | MERCHANT | Missing returnUrl/cancelUrl for app switch |

**Order/Payment Errors (NETWORK):**

| Code                                                   | Description                        |
| ------------------------------------------------------ | ---------------------------------- |
| `PAYPAL_CHECKOUT_V6_ORDER_CREATION_FAILED`             | Failed to create order             |
| `PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CREATION_FAILED` | Failed to create billing agreement |
| `PAYPAL_CHECKOUT_V6_TOKENIZATION_FAILED`               | Failed to tokenize payment         |

**Update Errors:**

| Code                                        | Type     | Description              |
| ------------------------------------------- | -------- | ------------------------ |
| `PAYPAL_CHECKOUT_V6_INVALID_UPDATE_OPTIONS` | MERCHANT | Invalid update options   |
| `PAYPAL_CHECKOUT_V6_PAYMENT_NOT_FOUND`      | MERCHANT | Payment ID doesn't match |
| `PAYPAL_CHECKOUT_V6_CURRENCY_MISMATCH`      | MERCHANT | Currency mismatch        |
| `PAYPAL_CHECKOUT_V6_INVALID_LINE_ITEMS`     | MERCHANT | Invalid line item format |
| `PAYPAL_CHECKOUT_V6_UPDATE_FAILED`          | NETWORK  | Update request failed    |

**Eligibility Errors:**

| Code                                             | Type     | Description                          |
| ------------------------------------------------ | -------- | ------------------------------------ |
| `PAYPAL_CHECKOUT_V6_SDK_NOT_INITIALIZED`         | MERCHANT | SDK not loaded before calling method |
| `PAYPAL_CHECKOUT_V6_INVALID_ELIGIBILITY_OPTIONS` | MERCHANT | Missing amount or currency           |
| `PAYPAL_CHECKOUT_V6_ELIGIBILITY_CHECK_FAILED`    | NETWORK  | PayPal eligibility API call failed   |

## Testing

### Running Tests

```bash
# Run all paypal-checkout-v6 tests
npm test paypal-checkout-v6

# Run single test file
jest test/paypal-checkout-v6/unit/paypal-checkout-v6.js
```

### Test Structure

Tests are in `test/paypal-checkout-v6/unit/`:

- `index.js` - Tests for `create()` and `isSupported()`
- `paypal-checkout-v6.js` - Tests for `PayPalCheckoutV6` class methods
- `export.js` - Module export tests

### Key Test Patterns

**Mocking the PayPal SDK:**

```javascript
window.paypal = {
  createInstance: jest.fn().mockResolvedValue(mockPayPalInstance),
  version: "6.0.0",
};
```

**Mocking Frame Service:**

```javascript
jest
  .spyOn(frameService, "create")
  .mockImplementation(yieldsAsync(fakeFrameService));
```

**Testing Session Creation:**

```javascript
const session = instance.createOneTimePaymentSession({
  amount: "10.00",
  currency: "USD",
  onApprove: jest.fn(),
});

expect(typeof session.start).toBe("function");
```

## Debugging

### Common Issues

**1. Tokenization Key Error**

```
PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED
```

**Fix:** Use a client token instead of tokenization key. V6 requires the full configuration available only in client tokens.

**2. SDK Not Loaded**

```
PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED
```

**Debug:**

1. Check if `loadPayPalSDK()` was called before creating sessions
2. Verify `window.paypal.createInstance` exists
3. Check browser console for script loading errors

**3. App Switch URLs Missing**

```
PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED
```

**Fix:** When using `presentationMode: 'direct-app-switch'`, provide both `returnUrl` and `cancelUrl`.

**4. Currency Mismatch in updatePayment**

```
PAYPAL_CHECKOUT_V6_CURRENCY_MISMATCH
```

**Fix:** Ensure all currencies (in shippingOptions, lineItems, amountBreakdown) match the original payment currency.

### Analytics Events

The component sends analytics events for debugging (see `constants.js`):

- `paypal-checkout-v6.initialized`
- `paypal-checkout-v6.load-sdk.started`
- `paypal-checkout-v6.sdk-load.succeeded` / `.failed`
- `paypal-checkout-v6.create-order.started` / `.succeeded` / `.failed`
- `paypal-checkout-v6.payment.started` / `.approved` / `.canceled`
- `paypal-checkout-v6.tokenize-payment.started` / `.success` / `.failed`

## Differences from paypal-checkout

| Feature           | paypal-checkout                    | paypal-checkout-v6                                  |
| ----------------- | ---------------------------------- | --------------------------------------------------- |
| SDK Version       | checkout.js                        | Web SDK v6                                          |
| Authorization     | Client token or tokenization key   | Client token only                                   |
| SDK Loading       | Manual script tag                  | `loadPayPalSDK()` method                            |
| API Pattern       | `createPayment()` + PayPal Buttons | Session-based (`createOneTimePaymentSession`)       |
| Button Rendering  | `paypal.Buttons()`                 | Custom button + `session.start()`                   |
| Instance Creation | N/A                                | `window.paypal.createInstance()`                    |
| Presentation      | Popup only                         | Multiple modes (popup, modal, redirect, app-switch) |
| Plan Metadata     | Limited                            | Full billing cycle support                          |

## Backend Endpoints

The component communicates with these Braintree Hermes endpoints:

- `paypal_hermes/create_payment_resource` - Create order for checkout flow
- `paypal_hermes/setup_billing_agreement` - Create billing agreement token
- `paypal_hermes/patch_payment_resource` - Update payment details
- `payment_methods/paypal_accounts` - Tokenize payment

## Implementation Notes

### Intent Mapping

The component maps PayPal intents to Braintree intents:

```javascript
// 'capture' is converted to 'sale' for the backend
if (intent === "capture") {
  intent = "sale";
}
```

### Frame Service

V6 uses frame service for the PayPal landing page (similar to other components):

```javascript
frameService.create({
  name: "braintreepaypallanding",
  dispatchFrameUrl: assetsUrl + "/html/dispatch-frame.min.html",
  openFrameUrl: assetsUrl + "/html/paypal-landing-frame.min.html",
});
```

### Currency Validation

The `_verifyConsistentCurrency()` method validates that all currency fields match:

- `shippingOptions[].amount.currency`
- `lineItems[].unitTaxAmountCurrency`
- `amountBreakdown.*Currency` fields
