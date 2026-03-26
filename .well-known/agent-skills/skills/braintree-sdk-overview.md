---
name: braintree-sdk-overview
description: Braintree Web SDK v3 architecture, component lifecycle, authorization types, and integration guide
---

# Braintree Web SDK Overview

## SDK Architecture

Braintree Web SDK v3 is a modular, client-side JavaScript SDK for accepting payments. Current version: **3.138.0**.

**Distribution:** npm (`braintree-web`) or CDN (`https://js.braintreegateway.com/web/{VERSION}/js/{component}.min.js`).

**Module system:** CommonJS (Browserify/Webpack compatible), UMD for CDN.

## Authorization Types

| Type                 | Format                                   | Use When                                                                        |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| **Tokenization Key** | `sandbox_xxx_yyy` / `production_xxx_yyy` | Simple card tokenization; public, no expiry                                     |
| **Client Token**     | Base64-encoded JSON                      | 3DS, vaulting, PayPal, customer-specific config; server-generated, expires ~24h |

**General guidance:** If a component requires server interaction beyond tokenization, use a client token.

## Component Selection Guide

| Use Case                            | Component(s)                                      |
| ----------------------------------- | ------------------------------------------------- |
| Credit/debit card input             | `hostedFields`                                    |
| Card + fraud prevention + 3DS       | `hostedFields` + `dataCollector` + `threeDSecure` |
| PayPal button                       | `paypalCheckout` (or `paypalCheckoutV6`)          |
| Venmo                               | `venmo`                                           |
| Apple Pay (Safari)                  | `applePay`                                        |
| Google Pay                          | `googlePayment`                                   |
| Local methods (iDEAL, Sofort, etc.) | `localPayment`                                    |
| SEPA Direct Debit                   | `sepa`                                            |
| ACH / US bank                       | `usBankAccount`                                   |
| Manage stored payments              | `vaultManager`                                    |

**Deprecated (do not use):** `paypal`, `masterpass`, `visaCheckout`, `preferredPaymentMethods`.

## Component Lifecycle Pattern

Every component follows this creation pattern:

```javascript
braintree.componentName.create(
  {
    client: clientInstance, // OR
    authorization: "token_here", // deferred client creation
    // ...component options
  },
  function (err, instance) {
    // instance ready
  }
);
```

**Internal flow:**

1. `basicComponentVerification.verify()` -- validates options, checks version compatibility
2. `createDeferredClient.create()` -- creates client from authorization if needed
3. Gateway configuration check -- verifies component is enabled
4. Component initialization -- returns instance via callback/Promise

**Dual API:** All public methods support both callbacks and Promises via `@braintree/wrap-promise`.

## Version Compatibility

All components must match the SDK version. Mixing versions produces:

```
BraintreeError {
  type: 'MERCHANT',
  code: 'INCOMPATIBLE_VERSIONS',
  message: 'Client (version X) and Component (version Y) must be from same SDK version'
}
```

**Fix:** Use the same version for all `braintree-web` imports or CDN scripts.

## Client Creation

The `client` component is foundational -- all other components depend on it.

**Pre-initialize early:** Call `braintree.client.create()` and all payment method component `create()` calls as early as possible in the page lifecycle (ideally on `DOMContentLoaded` or page load), not inside click handlers. This front-loads the gateway configuration fetch and iframe setup so that payment flows are immediate and synchronous when the user clicks. This is the single most impactful latency optimization for Braintree Web SDK integrations.

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    // Reuse clientInstance for all component creation
    return Promise.all([
      braintree.hostedFields.create({
        client: clientInstance,
        fields: {
          /* ... */
        },
      }),
      braintree.dataCollector.create({ client: clientInstance }),
      braintree.threeDSecure.create({ client: clientInstance, version: "2" }),
    ]);
  })
  .then(function (instances) {
    var hostedFields = instances[0];
    var dataCollector = instances[1];
    var threeDSecure = instances[2];
    // All ready
  });
```

## Error Types

All SDK errors are `BraintreeError` instances with a `type` property:

| Type       | Meaning                                    | Action                         |
| ---------- | ------------------------------------------ | ------------------------------ |
| `CUSTOMER` | End-user problem (invalid card, cancelled) | Show message, allow retry      |
| `MERCHANT` | Integration/config error                   | Fix code or Braintree settings |
| `NETWORK`  | Connectivity/timeout                       | Implement retry with backoff   |
| `INTERNAL` | SDK bug                                    | Report to Braintree            |
| `UNKNOWN`  | Indeterminate                              | Inspect `err.details`          |

## Teardown

Always clean up instances when done:

```javascript
instance.teardown(function (err) {
  // Resources released
});
```

Calling methods after teardown throws `METHOD_CALLED_AFTER_TEARDOWN`.

## Platform Support

The Braintree Web SDK is designed for standard browser environments. It is **not tested or supported** in hybrid runtimes such as Cordova, PhoneGap, Ionic, React Native, or Electron. Features that rely on popups, app switching, or `visibilitychange` events (PayPal, Venmo) may silently fail in these environments. Use the native iOS or Android Braintree SDKs for mobile app integrations.
