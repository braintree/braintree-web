# Apple Pay Component - CLAUDE.md

This file provides component-specific guidance for working with the Apple Pay component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Apple Pay component integrates with Apple's **ApplePaySession** API to enable Apple Pay payments on the web. It handles merchant validation, payment request creation, and tokenization of Apple Pay payments.

**Key Features:**

- Apple Pay merchant validation via Braintree gateway
- Payment request configuration with Braintree defaults
- Tokenization of Apple Pay payment tokens
- Support for deferred client creation
- Domain registration validation

**Docs:** [Braintree Apple Pay Guide](https://developer.paypal.com/braintree/docs/guides/apple-pay/overview)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `apple-pay.js` - Main ApplePay class implementation (3 public methods)
- `errors.js` - Apple Pay error codes (6 errors)

**Note:** This is a simple component (3 files) that acts as a bridge between Braintree and Apple's ApplePaySession API.

## How It Works

### Apple Pay Flow

```
1. Create Apple Pay Instance
   ↓
2. Check ApplePaySession Availability
   (window.ApplePaySession)
   ↓
3. Create Payment Request
   (with Braintree defaults)
   ↓
4. Create ApplePaySession
   ↓
5. Merchant Validation Event
   ↓
6. performValidation()
   (Braintree validates domain)
   ↓
7. Payment Authorization Event
   ↓
8. tokenize()
   (Convert Apple Pay token to Braintree nonce)
   ↓
9. Send Nonce to Server
```

### Prerequisites

**1. Apple Developer Setup:**

- Apple Developer account
- Merchant ID created in Apple Developer portal
- Domain registered with Apple for Apple Pay

**2. Braintree Setup:**

- Apple Pay enabled in Braintree control panel
- Domain registered in Braintree control panel
- Merchant identifier configured

**3. Browser Requirements:**

- Safari 10+ on macOS or iOS
- User logged into iCloud with Apple Pay enabled
- Valid Apple Pay card on file

**4. HTTPS Required:**

- Apple Pay only works on HTTPS domains (except localhost for development)

## Basic Usage

### Complete Implementation

```javascript
var applePay = require("braintree-web/apple-pay");

// 1. Check if Apple Pay is available
if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
  // 2. Create Apple Pay instance
  applePay.create(
    {
      client: clientInstance,
    },
    function (err, applePayInstance) {
      if (err) {
        console.error("Error creating Apple Pay:", err);
        return;
      }

      // 3. Show Apple Pay button
      document.getElementById("apple-pay-button").style.display = "block";

      document
        .getElementById("apple-pay-button")
        .addEventListener("click", function () {
          // 4. Create payment request
          var paymentRequest = applePayInstance.createPaymentRequest({
            total: {
              label: "My Store",
              amount: "19.99",
            },
          });

          // 5. Create Apple Pay session
          var session = new ApplePaySession(3, paymentRequest);

          // 6. Handle merchant validation
          session.onvalidatemerchant = function (event) {
            applePayInstance.performValidation(
              {
                validationURL: event.validationURL,
                displayName: "My Store",
              },
              function (validationErr, merchantSession) {
                if (validationErr) {
                  console.error("Validation failed:", validationErr);
                  session.abort();
                  return;
                }

                session.completeMerchantValidation(merchantSession);
              }
            );
          };

          // 7. Handle payment authorization
          session.onpaymentauthorized = function (event) {
            applePayInstance.tokenize(
              {
                token: event.payment.token,
              },
              function (tokenizeErr, payload) {
                if (tokenizeErr) {
                  console.error("Tokenization failed:", tokenizeErr);
                  session.completePayment(ApplePaySession.STATUS_FAILURE);
                  return;
                }

                // Send payload.nonce to server
                submitNonceToServer(payload.nonce)
                  .then(function () {
                    session.completePayment(ApplePaySession.STATUS_SUCCESS);
                  })
                  .catch(function () {
                    session.completePayment(ApplePaySession.STATUS_FAILURE);
                  });
              }
            );
          };

          // 8. Handle cancellation
          session.oncancel = function () {
            console.log("User canceled Apple Pay");
          };

          // 9. Start the session
          session.begin();
        });
    }
  );
}
```

## Configuration Options

### Creation Options

```javascript
applePay.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  useDeferredClient: true, // Optional: Immediate instance availability
});
```

### Payment Request Options

**Required Fields:**

```javascript
{
  total: {
    label: 'My Store',      // Merchant name displayed to user
    amount: '19.99',        // Total amount as string
    type: 'final'           // 'final' or 'pending'
  }
}
```

**Optional Fields:**

```javascript
{
  total: { /* ... */ },

  // Line items (itemized display)
  lineItems: [
    {
      label: 'Subtotal',
      amount: '17.99',
      type: 'final'
    },
    {
      label: 'Shipping',
      amount: '2.00',
      type: 'final'
    }
  ],

  // Shipping methods
  shippingMethods: [
    {
      label: 'Standard Shipping',
      detail: '5-7 business days',
      amount: '2.00',
      identifier: 'standard'
    },
    {
      label: 'Express Shipping',
      detail: '2-3 business days',
      amount: '5.00',
      identifier: 'express'
    }
  ],

  // Required information
  requiredBillingContactFields: ['postalAddress', 'email'],
  requiredShippingContactFields: ['postalAddress', 'phone', 'email', 'name'],

  // Shipping type
  shippingType: 'shipping',  // 'shipping', 'delivery', 'storePickup', 'servicePickup'

  // Application data (custom data)
  applicationData: btoa(JSON.stringify({ orderId: '123' }))
}
```

### Braintree Default Values

The SDK automatically applies these defaults from gateway configuration:

```javascript
{
  countryCode: 'US',                           // From Braintree config
  currencyCode: 'USD',                         // From Braintree config
  merchantCapabilities: ['supports3DS'],       // From Braintree config
  supportedNetworks: ['visa', 'masterCard', 'amex', 'discover']  // From Braintree config
}
```

**Note:** `supportedNetworks` is automatically mapped (e.g., `'mastercard'` → `'masterCard'`).

## Methods

### createPaymentRequest()

Creates an Apple Pay payment request with Braintree defaults merged in.

**Signature:**

```javascript
var paymentRequest = applePayInstance.createPaymentRequest(options);
// OR (with useDeferredClient)
applePayInstance.createPaymentRequest(options).then(function (paymentRequest) {
  // Use paymentRequest
});
```

**Parameters:**

- `options` (object): Payment request options (see Configuration Options above)

**Returns:**

- Synchronous: `object` - Payment request ready for `ApplePaySession`
- Deferred client: `Promise<object>` - Resolves with payment request

**Example:**

```javascript
var paymentRequest = applePayInstance.createPaymentRequest({
  total: {
    label: "My Company",
    amount: "19.99",
  },
  requiredBillingContactFields: ["postalAddress"],
});

var session = new ApplePaySession(3, paymentRequest);
```

### performValidation()

Validates the merchant with Apple via Braintree's gateway.

**Signature:**

```javascript
applePayInstance.performValidation(options, callback);
// OR
applePayInstance.performValidation(options).then(function (merchantSession) {
  // Use merchantSession
});
```

**Parameters:**

- `options.validationURL` (string, required): From `ApplePayValidateMerchantEvent`
- `options.displayName` (string, optional): Merchant display name
- `options.merchantIdentifier` (string, optional): Override merchant ID
- `options.domainName` (string, optional): Override domain name

**Returns:**

- `Promise<object>` - Merchant session object to pass to `session.completeMerchantValidation()`

**Example:**

```javascript
session.onvalidatemerchant = function (event) {
  applePayInstance.performValidation(
    {
      validationURL: event.validationURL,
      displayName: "My Great Store",
    },
    function (err, merchantSession) {
      if (err) {
        console.error(err);
        session.abort();
        return;
      }

      session.completeMerchantValidation(merchantSession);
    }
  );
};
```

### tokenize()

Converts an Apple Pay payment token to a Braintree payment method nonce.

**Signature:**

```javascript
applePayInstance.tokenize(options, callback);
// OR
applePayInstance.tokenize(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.token` (object, required): The `payment.token` from `ApplePayPaymentAuthorizedEvent`

**Returns:**

- `Promise<tokenizePayload>` - Tokenization result with nonce

**Payload Structure:**

```javascript
{
  nonce: 'tokencc_abc123_xyz789',
  type: 'ApplePayCard',
  description: 'Apple Pay',
  details: {
    cardType: 'Visa',                    // Card network
    cardHolderName: 'John Doe',          // Cardholder name
    dpanLastTwo: '34',                   // Last 2 digits
    isDeviceToken: true                  // DPAN vs MPAN
  },
  binData: {
    commercial: 'Unknown',
    countryOfIssuance: 'USA',
    debit: 'No',
    durbinRegulated: 'Yes',
    healthcare: 'No',
    issuingBank: 'Wells Fargo',
    payroll: 'No',
    prepaid: 'No',
    productId: '123',
    business: 'No',
    consumer: 'Yes',
    purchase: 'Yes',
    corporate: 'No'
  }
}
```

**Example:**

```javascript
session.onpaymentauthorized = function (event) {
  applePayInstance.tokenize(
    {
      token: event.payment.token,
    },
    function (err, payload) {
      if (err) {
        console.error(err);
        session.completePayment(ApplePaySession.STATUS_FAILURE);
        return;
      }

      // Send payload.nonce to server
      submitToServer(payload.nonce);

      session.completePayment(ApplePaySession.STATUS_SUCCESS);
    }
  );
};
```

## merchantIdentifier Property

A special read-only property containing the Braintree merchant identifier.

**Usage:**

```javascript
var canMakePayments = ApplePaySession.canMakePaymentsWithActiveCard(
  applePayInstance.merchantIdentifier
);

canMakePayments.then(function (canMakePayments) {
  if (canMakePayments) {
    // Show Apple Pay button
  }
});
```

**Note:** This is automatically set after client creation and is used to check if user has an active Apple Pay card.

## Error Handling

### Error Codes

From `errors.js`:

**Creation Errors:**

1. **`APPLE_PAY_NOT_ENABLED`** (MERCHANT)
   - Apple Pay not enabled in Braintree control panel
   - Fix: Enable Apple Pay in Braintree settings
   - Fix: Verify merchant account supports Apple Pay

**Validation Errors:**

2. **`APPLE_PAY_VALIDATION_URL_REQUIRED`** (MERCHANT)
   - Missing `validationURL` in `performValidation()` call
   - Fix: Pass `validationURL` from `ApplePayValidateMerchantEvent`

3. **`APPLE_PAY_MERCHANT_VALIDATION_FAILED`** (MERCHANT)
   - Domain not registered in Braintree control panel
   - Fix: Register domain in Braintree Control Panel → Settings → Processing → Apple Pay
   - Fix: Ensure domain matches exactly (including subdomain)

4. **`APPLE_PAY_MERCHANT_VALIDATION_NETWORK`** (NETWORK)
   - Network error during merchant validation
   - Fix: Check internet connection
   - Fix: Verify Braintree gateway is accessible
   - Fix: Retry validation

**Tokenization Errors:**

5. **`APPLE_PAY_PAYMENT_TOKEN_REQUIRED`** (MERCHANT)
   - Missing `token` in `tokenize()` call
   - Fix: Pass `event.payment.token` from `ApplePayPaymentAuthorizedEvent`

6. **`APPLE_PAY_TOKENIZATION`** (NETWORK)
   - Network error during tokenization
   - Fix: Check network connectivity
   - Fix: Retry tokenization
   - Fix: Check Braintree API status

## Testing

### Sandbox Testing

**1. Use Sandbox Account:**

```javascript
braintree.client
  .create({
    authorization: SANDBOX_TOKENIZATION_KEY,
  })
  .then(function (client) {
    return applePay.create({ client: client });
  });
```

**2. Apple Pay Sandbox Cards:**

- Use test cards from Apple's test environment
- Requires sandbox Apple ID
- See [Apple Pay Sandbox Testing Guide](https://developer.apple.com/apple-pay/sandbox-testing/)

**3. Domain Registration:**

- Register test domain in Braintree sandbox control panel
- Can use `localhost` for local development

### Unit Tests

Location: `test/apple-pay/unit/`

**Test Categories:**

- Component creation
- Payment request creation
- Merchant validation
- Tokenization
- Error scenarios
- Deferred client

## Debugging

### Common Issues

**1. "Apple Pay is not available"**

**Symptoms:**

- `window.ApplePaySession` is undefined
- `canMakePayments()` returns false

**Debug:**

1. Verify HTTPS (or localhost)
2. Check Safari version (10+)
3. Verify device has Apple Pay configured
4. Check if user is logged into iCloud
5. Ensure user has valid Apple Pay card

**2. "Merchant validation failed"**

**Symptoms:**

- `APPLE_PAY_MERCHANT_VALIDATION_FAILED` error
- 403 error from validation endpoint

**Debug:**

1. Verify domain registered in Braintree control panel
2. Check exact domain match (including subdomain)
3. Ensure domain verified with Apple
4. Try re-registering domain
5. Check merchant identifier in Apple Developer portal

**Fix:**

```javascript
// Braintree Control Panel → Settings → Processing → Apple Pay
// Add domain: www.example.com (must match exactly)
```

**3. "Session creation failed"**

**Symptoms:**

- `new ApplePaySession()` throws error
- "Must create a new ApplePaySession from a user gesture handler" error

**Debug:**

1. Ensure session created in response to user click
2. Don't create session in async callback
3. Create session synchronously in click handler

**Bad Example:**

```javascript
button.addEventListener("click", function () {
  fetchConfig().then(function (config) {
    // TOO LATE - not in direct response to click
    var session = new ApplePaySession(3, paymentRequest);
  });
});
```

**Good Example:**

```javascript
button.addEventListener('click', function () {
  // Create session immediately in click handler
  var session = new ApplePaySession(3, paymentRequest);

  session.onvalidatemerchant = function (event) {
    // Async work here is fine
    applePayInstance.performValidation(...);
  };

  session.begin();
});
```

**4. "Tokenization failed"**

**Symptoms:**

- `APPLE_PAY_TOKENIZATION` error
- Empty or invalid nonce

**Debug:**

1. Verify `event.payment.token` is passed correctly
2. Check network requests in developer tools
3. Verify authorization is valid
4. Check server-side logs

**5. Amount Formatting**

**Symptoms:**

- Apple Pay sheet shows wrong amount
- Validation errors

**Fix:**

```javascript
// GOOD: String with 2 decimal places
total: {
  label: 'My Store',
  amount: '19.99'
}

// BAD: Number or wrong format
total: {
  amount: 19.99        // Should be string
}
total: {
  amount: '19.9'       // Should be '19.90'
}
```

## Implementation Examples

### Basic Payment

```javascript
// Minimal implementation
braintree.applePay
  .create({
    client: clientInstance,
  })
  .then(function (applePayInstance) {
    var paymentRequest = applePayInstance.createPaymentRequest({
      total: {
        label: "My Store",
        amount: "10.00",
      },
    });

    var session = new ApplePaySession(3, paymentRequest);

    session.onvalidatemerchant = function (event) {
      applePayInstance
        .performValidation({
          validationURL: event.validationURL,
          displayName: "My Store",
        })
        .then(function (merchantSession) {
          session.completeMerchantValidation(merchantSession);
        })
        .catch(function (err) {
          console.error(err);
          session.abort();
        });
    };

    session.onpaymentauthorized = function (event) {
      applePayInstance
        .tokenize({
          token: event.payment.token,
        })
        .then(function (payload) {
          // Send payload.nonce to server
          return fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nonce: payload.nonce }),
          });
        })
        .then(function () {
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
        })
        .catch(function (err) {
          console.error(err);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
        });
    };

    session.begin();
  });
```

### With Shipping

```javascript
var paymentRequest = applePayInstance.createPaymentRequest({
  total: {
    label: 'My Store',
    amount: '22.00'
  },
  lineItems: [
    {
      label: 'Subtotal',
      amount: '20.00'
    },
    {
      label: 'Shipping',
      amount: '2.00'
    }
  ],
  shippingMethods: [
    {
      label: 'Standard Shipping',
      detail: '5-7 business days',
      amount: '2.00',
      identifier: 'standard'
    },
    {
      label: 'Express Shipping',
      detail: '2-3 business days',
      amount: '5.00',
      identifier: 'express'
    }
  ],
  requiredShippingContactFields: ['postalAddress', 'email', 'phone']
});

var session = new ApplePaySession(3, paymentRequest);

session.onshippingmethodselected = function (event) {
  var selectedShipping = event.shippingMethod;
  var subtotal = 20.00;
  var shippingCost = parseFloat(selectedShipping.amount);
  var total = subtotal + shippingCost;

  session.completeShippingMethodSelection({
    newTotal: {
      label: 'My Store',
      amount: total.toFixed(2)
    },
    newLineItems: [
      {
        label: 'Subtotal',
        amount: subtotal.toFixed(2)
      },
      {
        label: selectedShipping.label,
        amount: selectedShipping.amount
      }
    ]
  });
};

session.onshippingcontactselected = function (event) {
  var shippingContact = event.shippingContact;

  // Calculate shipping based on address
  var errors = [];
  var newShippingMethods = [...];

  session.completeShippingContactSelection({
    errors: errors,
    newShippingMethods: newShippingMethods,
    newTotal: { label: 'My Store', amount: '22.00' }
  });
};

// ... merchant validation and payment authorization as before
```

### With Deferred Client

```javascript
braintree.applePay
  .create({
    authorization: CLIENT_TOKEN,
    useDeferredClient: true,
  })
  .then(function (applePayInstance) {
    // Instance available immediately

    // Payment request returns promise with deferred client
    applePayInstance
      .createPaymentRequest({
        total: {
          label: "My Store",
          amount: "10.00",
        },
      })
      .then(function (paymentRequest) {
        var session = new ApplePaySession(3, paymentRequest);

        // ... rest of implementation
      });
  });
```

## Platform Requirements

**Browser Support:**

- Safari 10+ on macOS Sierra or later
- Safari on iOS 10+ (iPhone, iPad)
- Chrome, Edge, Firefox: Not supported (Apple restriction)

**Device Requirements:**

- Mac with Touch ID
- iPhone or iPad with Apple Pay
- Apple Watch paired with supported device

**Network Requirements:**

- HTTPS required (except localhost)
- Valid SSL certificate
- Domain registered with Apple and Braintree
