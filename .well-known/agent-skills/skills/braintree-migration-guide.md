---
name: braintree-migration-guide
description: Version migration paths, deprecated component replacements, and breaking changes for Braintree Web SDK
---

# Migration Guide

## Deprecated Components

| Component                 | Replacement      | Status                                            |
| ------------------------- | ---------------- | ------------------------------------------------- |
| `paypal`                  | `paypalCheckout` | Deprecated since v3.16.0. Requires PayPal JS SDK. |
| `masterpass`              | None             | Removed. Masterpass discontinued by Mastercard.   |
| `visaCheckout`            | None             | Removed. Visa Checkout replaced by Click to Pay.  |
| `preferredPaymentMethods` | None             | Removed.                                          |

## 3D Secure v1 to v2

**Removed in v3.91.0.** Use version 2 for all integrations.

```javascript
// OLD (v1, removed):
braintree.threeDSecure
  .create({
    client: clientInstance,
    // version defaults to 1
  })
  .then(function (threeDSecureInstance) {
    threeDSecureInstance.verifyCard(
      {
        nonce: nonce,
        amount: "100.00",
      },
      callback
    );
  });

// NEW (v2):
braintree.threeDSecure
  .create({
    client: clientInstance,
    version: "2", // Required
  })
  .then(function (threeDSecureInstance) {
    // Must register lookup-complete handler
    threeDSecureInstance.on("lookup-complete", function (data, next) {
      next(); // Proceed with challenge if needed
    });

    threeDSecureInstance.verifyCard(
      {
        nonce: nonce,
        bin: bin, // Now required
        amount: "100.00",
      },
      callback
    );
  });
```

**Key differences:**

- `version: '2'` required in create options
- `bin` parameter required in `verifyCard`
- `lookup-complete` event handler replaces automatic flow
- Cardinal Songbird.js loaded automatically
- `requestedExemptionType` replaces deprecated `exemptionRequested`

## paypal to paypal-checkout

```javascript
// OLD (deprecated paypal component):
braintree.paypal
  .create({ client: clientInstance })
  .then(function (paypalInstance) {
    paypalInstance.tokenize({ flow: "checkout" }, callback);
  });

// NEW (paypal-checkout):
// 1. Add to HTML: <script src="https://www.paypal.com/sdk/js?client-id=YOUR_ID"></script>
braintree.paypalCheckout
  .create({ client: clientInstance })
  .then(function (ppCheckout) {
    paypal
      .Buttons({
        createOrder: function () {
          return ppCheckout.createPayment({
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
          });
        },
        onApprove: function (data) {
          return ppCheckout.tokenizePayment(data).then(function (payload) {
            submitToServer(payload.nonce);
          });
        },
      })
      .render("#paypal-button");
  });
```

## paypal-checkout to paypal-checkout-v6

New session-based API introduced in v3.135.0:

- `paypalCheckoutV6` requires **client token** (not tokenization key)
- Uses `loadPayPalSDK()` instead of external `<script>` tag
- Session-based flow with `createCheckoutWithVaultSession` (v3.138.0)
- More integrated with PayPal Web SDK v6

## Google Pay v1 to v2

```javascript
// OLD (v1, deprecated):
braintree.googlePayment.create({
  client: clientInstance,
  // googlePayVersion defaults to 1
});

// NEW (v2):
braintree.googlePayment.create({
  client: clientInstance,
  googlePayVersion: 2,
  googleMerchantId: "BCR2DN...", // Required for PRODUCTION
});
```

**Breaking changes in v3.29.0:**

- Switched from iframe-based to Google Pay.js script tag
- Removed methods: `isSupported`, `tokenize`, `createSupportedPaymentMethodsConfiguration`, `on`
- Error codes renamed: `PAY_WITH_GOOGLE_*` to `GOOGLE_PAYMENT_*`

## Data Collector Changes

| Version  | Change                                                   |
| -------- | -------------------------------------------------------- |
| v3.114.0 | Kount deprecated. Data Collector now uses Fraudnet only. |
| v3.83.0  | `clientMetadataId` renamed to `riskCorrelationId`        |
| v3.82.0  | `correlationId` renamed to `clientMetadataId`            |

```javascript
// Current usage:
braintree.dataCollector
  .create({
    client: clientInstance,
    // No kount-specific options needed
  })
  .then(function (dataCollectorInstance) {
    var deviceData = dataCollectorInstance.deviceData; // JSON string
    // Send with transaction
  });
```

## Hosted Fields Changes

| Version  | Change                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| v3.136.0 | 8-digit BIN support added to `binAvailable` event                               |
| v3.134.0 | CSP SRI hashes for hosted field scripts                                         |
| v3.13.0  | **Breaking:** Invalid field keys now throw errors (previously silently ignored) |

## 3DS Exemption Changes (v3.91.0+)

```javascript
// OLD (deprecated):
threeDSecureInstance.verifyCard({
  nonce: nonce,
  amount: "10.00",
  exemptionRequested: true, // Deprecated
});

// NEW:
threeDSecureInstance.verifyCard({
  nonce: nonce,
  bin: bin, // Now required
  amount: "10.00",
  requestedExemptionType: "low_value", // or 'transaction_risk_analysis'
});
```

## Payment Request Changes (v3.28.0)

```javascript
// OLD:
{
  payWithGoogle: {
    /* ... */
  }
}

// NEW:
{
  googlePay: {
    /* ... */
  }
}
```

## Recent Feature Additions

| Version  | Feature                                                         |
| -------- | --------------------------------------------------------------- |
| v3.138.0 | PayPal Checkout v6: `createCheckoutWithVaultSession`            |
| v3.137.0 | Alternative Payment: Cryptocurrency support                     |
| v3.136.0 | Venmo: `riskCorrelationId` option                               |
| v3.135.0 | New `paypalCheckoutV6` component; 8-digit BIN verification      |
| v3.134.0 | Instant Verification: `getAchMandateDetails`; CSP SRI hashes    |
| v3.133.0 | Venmo: iOS mobile web polling fix; Local Payment: Swish support |

## Removed Platform Support

| Version  | Removal                                       |
| -------- | --------------------------------------------- |
| v3.135.0 | Bower package manager support removed         |
| v3.92.2  | IE9 support dropped; Promise polyfill removed |

## Version Compatibility Check

All components must use the same SDK version. Mixing produces `INCOMPATIBLE_VERSIONS`. When upgrading:

1. Update all `braintree-web` imports/CDN scripts simultaneously
2. Clear browser cache (CDN scripts may be cached)
3. Test all payment flows after upgrade
