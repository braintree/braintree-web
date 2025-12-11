# Payment Request Component - CLAUDE.md

This file provides component-specific guidance for working with the Payment Request component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Payment Request component integrates with the **W3C Payment Request API** to provide a browser-native payment experience. This allows customers to pay using credit cards (basicCard) or Google Pay through the browser's built-in payment UI.

**Note:** This component is currently in **beta** and the API may include breaking changes. Review the Changelog when upgrading.

**Key Features:**

- Browser-native payment UI (no custom forms needed)
- Support for credit cards via basicCard
- Google Pay integration (v1 and v2)
- Shipping address and option collection
- Event-driven API for dynamic updates
- Automatic browser compatibility detection

**Docs:** [W3C Payment Request API](https://www.w3.org/TR/payment-request/)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `external/payment-request.js` - Main PaymentRequestComponent class
- `internal/index.js` - Internal frame handler for Google Pay
- `shared/errors.js` - Payment Request error codes (11 errors)
- `shared/constants.js` - Constants and event names

**Note:** This is a complex component that uses iframes for Google Pay tokenization and framebus for communication.

## How It Works

### Payment Request Flow

```
1. Check Browser Support
   (window.PaymentRequest exists)
   ↓
2. Create Payment Request Instance
   ↓
3. Create Payment Request Configuration
   (details, options)
   ↓
4. Call tokenize(configuration)
   ↓
5. Browser Shows Payment UI
   (native dialog)
   ↓
6. Customer Selects Payment Method
   (card or Google Pay)
   ↓
7. Customer Confirms
   ↓
8. Payment Method Tokenized
   ↓
9. Receive Nonce
   ↓
10. Send Nonce to Server
```

### Prerequisites

**1. Browser Support:**

- Chrome 61+, Edge 79+, Safari 11.1+ (limited support)
- Check: `window.PaymentRequest` exists
- Not supported: Firefox, older browsers

**2. Braintree Setup:**

- Credit card processing enabled (for basicCard)
- Google Pay enabled (for googlePay option)

**3. Payment Method Configuration:**

- At least one payment method must be enabled
- Configure via merchant account or creation options

## Basic Usage

### Complete Implementation

```javascript
var paymentRequest = require("braintree-web/payment-request");

// 1. Check browser support
if (!window.PaymentRequest) {
  console.log("Payment Request API not supported");
  // Fall back to Hosted Fields
  return;
}

// 2. Create client
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (clientErr, clientInstance) {
    if (clientErr) {
      console.error("Error creating client:", clientErr);
      return;
    }

    // 3. Create Payment Request instance
    paymentRequest.create(
      {
        client: clientInstance,
        enabledPaymentMethods: {
          basicCard: true,
          googlePay: true,
        },
        googlePayVersion: 2,
      },
      function (createErr, paymentRequestInstance) {
        if (createErr) {
          console.error("Error creating Payment Request:", createErr);
          return;
        }

        // 4. Setup payment button
        document
          .getElementById("pay-button")
          .addEventListener("click", function () {
            // 5. Create payment request configuration
            var paymentRequestConfig = {
              details: {
                total: {
                  label: "Total",
                  amount: {
                    currency: "USD",
                    value: "100.00",
                  },
                },
              },
              options: {
                requestPayerName: true,
                requestPayerEmail: true,
              },
            };

            // 6. Tokenize
            paymentRequestInstance.tokenize(
              paymentRequestConfig,
              function (tokenizeErr, payload) {
                if (tokenizeErr) {
                  if (tokenizeErr.code === "PAYMENT_REQUEST_CANCELED") {
                    console.log("Customer canceled");
                  } else {
                    console.error("Error tokenizing:", tokenizeErr);
                  }
                  return;
                }

                // 7. Send nonce to server
                console.log("Got nonce:", payload.nonce);
                submitPayment(payload.nonce);
              }
            );
          });
      }
    );
  }
);
```

## Configuration Options

### Creation Options

```javascript
paymentRequest.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  enabledPaymentMethods: {
    // Optional
    basicCard: true, // Show credit card option
    googlePay: true, // Show Google Pay option
  },
  googlePayVersion: 2, // Google Pay version (1 or 2)
});
```

**Parameters:**

- `client` (Client, optional): A Braintree Client instance
- `authorization` (string, optional): A tokenizationKey or clientToken
- `enabledPaymentMethods` (object, optional): Which payment methods to enable
- `enabledPaymentMethods.basicCard` (boolean, default: true): Enable credit cards
- `enabledPaymentMethods.googlePay` (boolean, default: true): Enable Google Pay
- `googlePayVersion` (number, default: 1): Google Pay API version (1 or 2)

### Payment Request Configuration

The `tokenize()` method accepts a configuration object matching the W3C Payment Request API:

```javascript
{
  details: {
    total: {
      label: 'Total',
      amount: {
        currency: 'USD',
        value: '100.00'
      }
    },
    displayItems: [
      {
        label: 'Subtotal',
        amount: { currency: 'USD', value: '90.00' }
      },
      {
        label: 'Tax',
        amount: { currency: 'USD', value: '10.00' }
      }
    ],
    shippingOptions: [
      {
        id: 'standard',
        label: 'Standard Shipping',
        amount: { currency: 'USD', value: '5.00' },
        selected: true
      }
    ]
  },
  options: {
    requestPayerName: true,
    requestPayerEmail: true,
    requestPayerPhone: false,
    requestShipping: true,
    shippingType: 'shipping'  // 'shipping', 'delivery', 'pickup'
  },
  supportedPaymentMethods: [/* custom config */]  // Optional override
}
```

## Methods

### tokenize()

Opens the browser's native payment UI and tokenizes the selected payment method.

**Signature:**

```javascript
paymentRequestInstance.tokenize(configuration, callback);
// OR
paymentRequestInstance.tokenize(configuration).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `configuration` (object, required): Payment request configuration (see above)

**Returns:**

- `Promise<tokenizePayload>` - Resolves with payment method nonce and details

**Payload Structure:**

```javascript
{
  nonce: 'tokencc_abc_123',
  type: 'CreditCard',  // or 'AndroidPayCard'
  description: 'ending in 11',
  details: {
    bin: '411111',
    cardType: 'Visa',
    lastFour: '1111',
    lastTwo: '11',
    rawPaymentResponse: {  // Browser's PaymentResponse object
      payerName: 'John Doe',
      payerEmail: 'john@example.com',
      shippingAddress: { /* address object */ },
      shippingOption: 'standard'
    }
  },
  binData: {
    commercial: 'No',
    countryOfIssuance: 'USA',
    debit: 'No',
    // ... more bin data
  }
}
```

**Example:**

```javascript
paymentRequestInstance
  .tokenize({
    details: {
      total: {
        label: "My Store",
        amount: { currency: "USD", value: "25.00" },
      },
    },
  })
  .then(function (payload) {
    console.log("Payment method:", payload.type);
    console.log("Nonce:", payload.nonce);

    // Send to server
    return fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce: payload.nonce }),
    });
  })
  .catch(function (err) {
    if (err.code === "PAYMENT_REQUEST_CANCELED") {
      console.log("User canceled payment");
    } else {
      console.error("Payment failed:", err);
    }
  });
```

### createSupportedPaymentMethodsConfiguration()

Creates a supported payment methods configuration array for custom payment request setup.

**Signature:**

```javascript
paymentRequestInstance.createSupportedPaymentMethodsConfiguration(options);
```

**Parameters:**

- `options.type` (string, required): 'basicCard' or 'googlePay'
- `options.config` (object, optional): Additional configuration for the payment method

**Returns:**

- `Array` - Supported payment methods array for Payment Request API

**Example:**

```javascript
var supportedMethods =
  paymentRequestInstance.createSupportedPaymentMethodsConfiguration({
    type: "basicCard",
  });

// Use in custom PaymentRequest
var request = new PaymentRequest(supportedMethods, details, options);
```

### canMakePayment()

Checks if the customer can make a payment with the configured payment methods.

**Signature:**

```javascript
paymentRequestInstance.canMakePayment(configuration, callback);
// OR
paymentRequestInstance.canMakePayment(configuration).then(function (result) {
  // Use result
});
```

**Parameters:**

- `configuration` (object, required): Payment request configuration

**Returns:**

- `Promise<object>` - Result object with `canMakePayment` and method availability

**Result Structure:**

```javascript
{
  canMakePayment: true,
  applePay: false,
  basicCard: true,
  googlePay: true
}
```

**Example:**

```javascript
paymentRequestInstance
  .canMakePayment({
    details: { total: { amount: { value: "10.00", currency: "USD" } } },
  })
  .then(function (result) {
    if (!result.canMakePayment) {
      console.log("Customer cannot pay with any enabled method");
      // Show alternative payment option
    } else {
      console.log("Available methods:", result);
      // Show payment request button
    }
  });
```

### on()

Subscribes to shipping address or shipping option change events.

**Signature:**

```javascript
paymentRequestInstance.on(eventName, handler);
```

**Events:**

- `shippingAddressChange` - Customer selects shipping address
- `shippingOptionChange` - Customer selects shipping option

**Example:**

```javascript
paymentRequestInstance.on("shippingAddressChange", function (event) {
  console.log("New address:", event.target.shippingAddress);

  // Update shipping options or total based on address
  event.updateWith({
    total: { amount: { value: "105.00", currency: "USD" } },
    shippingOptions: [
      /* updated options */
    ],
  });
});
```

### off()

Unsubscribes from events.

**Signature:**

```javascript
paymentRequestInstance.off(eventName, handler);
```

### teardown()

Tears down the Payment Request instance.

**Signature:**

```javascript
paymentRequestInstance.teardown(callback);
// OR
paymentRequestInstance.teardown().then(function () {
  // Teardown complete
});
```

## Error Handling

### Error Codes

From `shared/errors.js`:

**Creation Errors:**

1. **`PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS`** (MERCHANT)
   - No valid payment methods configured
   - Fix: Enable credit cards or Google Pay in merchant account
   - Fix: Check `enabledPaymentMethods` configuration

**tokenize Errors:**

2. **`PAYMENT_REQUEST_CANCELED`** (CUSTOMER)
   - Customer canceled the payment
   - Expected behavior, not an error
   - Handle gracefully

3. **`PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED`** (MERCHANT)
   - Payment request configuration is invalid
   - Fix: Check `details` and `options` objects
   - Fix: Verify total amount format

4. **`PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE`** (MERCHANT)
   - Google Pay tokenization failed
   - Fix: Check Google Pay configuration
   - Fix: Verify merchant account Google Pay setup

5. **`PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR`** (UNKNOWN)
   - Error parsing Google Pay response
   - Usually indicates gateway issue

6. **`PAYMENT_REQUEST_NOT_COMPLETED`** (CUSTOMER)
   - Payment could not be completed
   - Handle as payment failure

**canMakePayment Errors:**

7. **`PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED`** (UNKNOWN)
   - canMakePayment() failed
   - Log and continue

8. **`PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED`** (MERCHANT)
   - Called multiple times with different configs
   - Fix: Only call once per page load

9. **`PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD`** (MERCHANT)
   - Unsupported payment method in configuration
   - Fix: Use only 'basicCard' or 'googlePay'

**createSupportedPaymentMethodsConfiguration Errors:**

10. **`PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE`** (MERCHANT)
    - Missing `type` parameter
    - Fix: Provide 'basicCard' or 'googlePay'

11. **`PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED`** (MERCHANT)
    - Type not enabled for merchant
    - Fix: Enable payment method in merchant account

## Testing

### Test Structure

Location: `test/payment-request/unit/`

## Debugging

### Common Issues

**1. "Payment Request API not supported"**

- Check `window.PaymentRequest` exists
- Use feature detection and fallback to Hosted Fields

**2. "No valid supported payment methods"**

- Verify merchant account has payment methods enabled
- Check `enabledPaymentMethods` configuration
- Ensure at least one method is available

**3. "Payment Request canceled"**

- Normal user behavior
- Don't treat as error
- Allow retry

**4. "Google Pay not showing"**

- Verify Google Pay enabled in merchant account
- Check browser supports Google Pay
- Ensure `enabledPaymentMethods.googlePay: true`

## Browser Support

- **Chrome:** 61+
- **Edge:** 79+
- **Safari:** 11.1+ (limited, prefer Apple Pay)
- **Firefox:** Not supported
- **Mobile:** Android Chrome, iOS Safari (limited)

Always use feature detection and provide fallback.
