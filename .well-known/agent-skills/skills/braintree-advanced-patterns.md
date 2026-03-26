---
name: braintree-advanced-patterns
description: SDK internals and shared patterns - dual API, events, deferred client, Frame Service, CSP, analytics, teardown
---

# Advanced SDK patterns

## Callback/Promise Dual API

All public methods support both callbacks and Promises via `@braintree/wrap-promise`:

```javascript
// Callback style:
component.create(options, function (err, instance) {
  /* ... */
});
instance.tokenize(options, function (err, payload) {
  /* ... */
});

// Promise style:
component.create(options).then(function (instance) {
  /* ... */
});
instance.tokenize(options).then(function (payload) {
  /* ... */
});
```

Both are equivalent. Do not provide both a callback and use `.then()`.

## Event Emitter Pattern

Complex components use `@braintree/event-emitter`:

```javascript
instance.on("eventName", function (data) {
  /* ... */
});
instance.off("eventName", handler);
```

**Components with events:**

- **Hosted Fields:** `focus`, `blur`, `validityChange`, `cardTypeChange`, `binAvailable`, `inputSubmitRequest`
- **3D Secure:** `lookup-complete`, `authentication-modal-render`, `authentication-modal-close`, `authentication-iframe-available`, `authentication-iframe-unavailable`
- **Venmo:** (internal events for flow coordination)

Some events pass a `next` function for flow control:

```javascript
threeDSecureInstance.on("lookup-complete", function (data, next) {
  // Inspect data, then call next() to proceed
  next();
});
```

## Deferred Client Creation

Components can be created with `authorization` instead of `client`, deferring client creation:

```javascript
braintree.hostedFields
  .create({
    authorization: CLIENT_TOKEN, // Instead of client instance
    fields: {
      /* ... */
    },
  })
  .then(function (instance) {
    // Client created internally, instance ready
  });
```

With `useDeferredClient: true`, the instance is available immediately but some methods return Promises instead of synchronous values:

```javascript
braintree.applePay
  .create({
    authorization: CLIENT_TOKEN,
    useDeferredClient: true,
  })
  .then(function (applePayInstance) {
    // Instance available immediately
    // But createPaymentRequest returns a Promise:
    applePayInstance.createPaymentRequest(options).then(function (request) {
      /* ... */
    });
  });
```

## Frame Service Architecture

Used by PayPal, Venmo, SEPA, and Local Payment for popup/modal flows.

**Two-frame architecture:**

1. **Dispatch frame** -- hidden iframe for message routing
2. **Open frame** -- visible popup/modal for user interaction

**Communication:** Uses `framebus` library for secure cross-origin postMessage.

**Flow:**

1. Component calls Frame Service to open popup/modal
2. Frame Service creates dispatch iframe
3. User interacts with external service (PayPal, bank, etc.)
4. Result communicated back via framebus
5. Frame Service closes popup, returns data to component

**Popup vs redirect:** Frame Service supports both. Popup is preferred (no page navigation), redirect is fallback for environments that block popups.

## Content Security Policy (CSP)

### Hosted Fields

```
frame-src: https://assets.braintreegateway.com
script-src: https://js.braintreegateway.com
style-src: 'unsafe-inline'
connect-src: https://*.braintreegateway.com https://*.braintree-api.com
```

### 3D Secure (Cardinal)

```
script-src: https://songbird.cardinalcommerce.com https://songbirdstag.cardinalcommerce.com
frame-src: https://songbird.cardinalcommerce.com https://*.cardinalcommerce.com
connect-src: https://*.cardinalcommerce.com https://cardinaltrusted.com
```

### PayPal

```
script-src: https://www.paypal.com https://www.sandbox.paypal.com
frame-src: https://www.paypal.com https://www.sandbox.paypal.com
connect-src: https://www.paypal.com https://www.sandbox.paypal.com
```

### Venmo

```
connect-src: https://api.braintreegateway.com (GraphQL for polling)
style-src: 'nonce-{value}' (use styleCspNonce option)
img-src: data: (QR code canvas)
```

### Google Pay

```
script-src: https://pay.google.com
frame-src: https://pay.google.com
```

### Data Collector / FraudNet

```
script-src: https://*.paypalobjects.com 'unsafe-eval'
```

**Note:** FraudNet uses `eval()` internally, requiring `'unsafe-eval'` in `script-src`.

### Apple Pay

No additional CSP needed beyond standard Braintree domains.

## Analytics Events

Components send analytics for debugging and monitoring:

```javascript
var analytics = require("../lib/analytics");
analytics.sendEvent(client, "hosted-fields.tokenization.started");
analytics.sendEvent(client, "three-d-secure.verification.completed");
```

Event naming: `component-name.action.state`

## Teardown Lifecycle

All components support `teardown()` for cleanup:

```javascript
instance.teardown().then(function () {
  // Event listeners removed
  // Iframes removed from DOM
  // Network connections closed
  // Instance unusable after this
});
```

Calling any method after teardown throws `METHOD_CALLED_AFTER_TEARDOWN`.

**Multi-component teardown:**

```javascript
Promise.all([
  hostedFieldsInstance.teardown(),
  threeDSecureInstance.teardown(),
  dataCollectorInstance.teardown(),
]).then(function () {
  // All cleaned up, safe to create new instances
});
```

## Client Caching

The SDK caches client instances by authorization fingerprint. Multiple `client.create()` calls with the same authorization reuse the same gateway configuration, avoiding redundant network requests.

## GraphQL Routing

The client automatically routes requests to GraphQL when:

1. GraphQL is enabled in gateway configuration
2. The endpoint is in the enabled features list
3. The request doesn't contain inputs incompatible with GraphQL (for example, UnionPay enrollment)

No developer action needed -- routing is transparent.

## Error Instance Properties

```javascript
// Every BraintreeError has:
err.type; // 'CUSTOMER', 'MERCHANT', 'NETWORK', 'INTERNAL', 'UNKNOWN'
err.code; // 'HOSTED_FIELDS_FIELDS_INVALID', etc.
err.message; // Human-readable description
err.details; // Optional: { originalError: Error, ... }
```

`err.details.originalError` often contains the underlying HTTP or SDK error with more context.
