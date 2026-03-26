---
name: braintree-apple-pay
description: Apple Pay web integration via ApplePaySession - payment requests, merchant validation, and tokenization
---

# Apple Pay Integration

## Prerequisites

- Apple Developer account with Merchant ID
- Domain registered in both Apple Developer portal and Braintree control panel
- HTTPS required (localhost OK for development)
- Safari 10+ on macOS/iOS only
- User has Apple Pay configured with valid card

## Complete Flow

```javascript
// 1. Check availability
if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
  return; // Apple Pay not available
}

// 2. Create instance
braintree.applePay
  .create({
    client: clientInstance,
  })
  .then(function (applePayInstance) {
    document
      .getElementById("apple-pay-button")
      .addEventListener("click", function () {
        // 3. Create payment request (MUST be synchronous in click handler)
        var paymentRequest = applePayInstance.createPaymentRequest({
          total: { label: "My Store", amount: "19.99" },
        });

        // 4. Create session (MUST be in direct click handler, not async callback)
        var session = new ApplePaySession(3, paymentRequest);

        // 5. Merchant validation
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
              session.abort();
            });
        };

        // 6. Payment authorization
        session.onpaymentauthorized = function (event) {
          applePayInstance
            .tokenize({
              token: event.payment.token,
            })
            .then(function (payload) {
              // payload.nonce, payload.details.cardType, payload.details.dpanLastTwo
              return submitToServer(payload.nonce);
            })
            .then(function () {
              session.completePayment(ApplePaySession.STATUS_SUCCESS);
            })
            .catch(function () {
              session.completePayment(ApplePaySession.STATUS_FAILURE);
            });
        };

        session.oncancel = function () {
          /* user cancelled */
        };

        session.begin();
      });
  });
```

## Payment Request Options

```javascript
applePayInstance.createPaymentRequest({
  total: { label: "My Store", amount: "22.00", type: "final" },
  lineItems: [
    { label: "Subtotal", amount: "20.00" },
    { label: "Shipping", amount: "2.00" },
  ],
  shippingMethods: [
    {
      label: "Standard",
      detail: "5-7 days",
      amount: "2.00",
      identifier: "standard",
    },
    {
      label: "Express",
      detail: "2-3 days",
      amount: "5.00",
      identifier: "express",
    },
  ],
  requiredBillingContactFields: ["postalAddress", "email"],
  requiredShippingContactFields: ["postalAddress", "phone", "email", "name"],
  shippingType: "shipping", // 'shipping', 'delivery', 'storePickup', 'servicePickup'
});
// The SDK automatically includes: countryCode, currencyCode, merchantCapabilities, supportedNetworks
```

## Shipping Selection

```javascript
session.onshippingmethodselected = function (event) {
  var shipping = parseFloat(event.shippingMethod.amount);
  session.completeShippingMethodSelection({
    newTotal: { label: "My Store", amount: (subtotal + shipping).toFixed(2) },
    newLineItems: [
      { label: "Subtotal", amount: subtotal.toFixed(2) },
      {
        label: event.shippingMethod.label,
        amount: event.shippingMethod.amount,
      },
    ],
  });
};
```

## Common Errors

| Code                                    | Type     | Fix                                                      |
| --------------------------------------- | -------- | -------------------------------------------------------- |
| `APPLE_PAY_NOT_ENABLED`                 | MERCHANT | Enable Apple Pay in Braintree control panel              |
| `APPLE_PAY_VALIDATION_URL_REQUIRED`     | MERCHANT | Pass `event.validationURL` to `performValidation`        |
| `APPLE_PAY_MERCHANT_VALIDATION_FAILED`  | MERCHANT | Register exact domain (including subdomain) in Braintree |
| `APPLE_PAY_MERCHANT_VALIDATION_NETWORK` | NETWORK  | Check network, retry                                     |
| `APPLE_PAY_PAYMENT_TOKEN_REQUIRED`      | MERCHANT | Pass `event.payment.token` to `tokenize`                 |
| `APPLE_PAY_TOKENIZATION`                | NETWORK  | Check network, retry                                     |

## Important: Session timing

`new ApplePaySession()` **must** be created synchronously in the click handler. Creating it inside an async callback (Promise `.then`, `setTimeout`, `fetch.then`) will throw:

> "Must create a new ApplePaySession from a user gesture handler"

Async work (validation, tokenization) can happen inside the session event handlers.

## Merchant Identifier

```javascript
// Check if user has active Apple Pay card
ApplePaySession.canMakePaymentsWithActiveCard(
  applePayInstance.merchantIdentifier
).then(function (canMake) {
  if (canMake) {
    /* show button */
  }
});
```
