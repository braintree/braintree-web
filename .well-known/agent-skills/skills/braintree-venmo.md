---
name: braintree-venmo
description: Venmo payments across mobile and desktop - app deep-link, QR code, web login, polling, and browser detection
---

# Venmo Integration

## Platform Flows

| Flow | Platform | Config | Mechanism |
|------|----------|--------|-----------|
| Mobile app deep-link | iOS/Android | Default | Opens Venmo app, polls for result |
| Mobile web fallback | Mobile (no app) | `mobileWebFallBack: true` | Web login in new tab |
| Desktop QR code | Desktop | `allowDesktop: true` | Modal with QR code, phone scan |
| Desktop web login | Desktop | `allowDesktopWebLogin: true` | Popup window login |

## Basic Setup

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktop: true,
  paymentMethodUsage: 'single_use'  // or 'multi_use'
}).then(function (venmoInstance) {

  // Check browser support first
  if (!venmoInstance.isBrowserSupported()) {
    console.log('Venmo not supported');
    return;
  }

  payButton.addEventListener('click', function () {
    venmoInstance.tokenize(function (err, payload) {
      if (err) {
        if (err.code === 'VENMO_CANCELED' || err.code === 'VENMO_APP_CANCELED' ||
            err.code === 'VENMO_CUSTOMER_CANCELED' || err.code === 'VENMO_DESKTOP_CANCELED') {
          console.log('User cancelled');
          return;
        }
        console.error(err);
        return;
      }

      // payload.nonce, payload.details.username, payload.details.payerInfo
      submitNonceToServer(payload.nonce);
    });
  });
});
```

## Configuration Options

```javascript
braintree.venmo.create({
  client: clientInstance,

  // Mobile
  allowNewBrowserTab: true,        // Allow new tab for auth
  allowWebviews: true,             // Allow from webviews (Instagram, Facebook, and others)
  mobileWebFallBack: true,         // Web login if no Venmo app
  requireManualReturn: false,      // User must manually return to merchant

  // Desktop
  allowDesktop: true,              // Enable desktop QR code flow
  allowDesktopWebLogin: false,     // Use popup login instead of QR
  styleCspNonce: 'nonce-value',    // Required with CSP for injected styles

  // Payment context
  paymentMethodUsage: 'single_use', // Required for desktop flows
  profileId: 'venmo-profile-id',
  displayName: 'My Business',
  riskCorrelationId: 'custom-id',  // Custom risk tracking ID

  // Enriched customer data
  collectCustomerBillingAddress: true,
  collectCustomerShippingAddress: true,
  totalAmount: '100.00',
  lineItems: [{
    quantity: 1,
    unitAmount: '100.00',
    name: 'Premium Widget',
    kind: 'debit'
  }]
});
```

## Desktop QR Code Flow

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktop: true,
  paymentMethodUsage: 'single_use'
}).then(function (venmoInstance) {
  payButton.addEventListener('click', function () {
    venmoInstance.tokenize(function (err, payload) {
      // Modal with QR code appears automatically
      // SDK polls every 1 second for approval
      // Modal closes on approval after 2-second visual delay
      if (err) return;
      submitNonceToServer(payload.nonce);
    });
  });
});
```

## Desktop Web Login Flow

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktopWebLogin: true,
  paymentMethodUsage: 'single_use',
  styleCspNonce: document.querySelector('meta[name="csp-nonce"]').content
}).then(function (venmoInstance) {
  // Opens popup window for Venmo web login
  // No QR code, no polling
});
```

## Enriched Customer Data

```javascript
venmoInstance.tokenize({
  totalAmount: '100.00',
  collectCustomerBillingAddress: true,
  collectCustomerShippingAddress: true,
  isFinalAmount: true,
  lineItems: [{
    quantity: 1, unitAmount: '100.00', name: 'Widget', kind: 'debit'
  }]
}, function (err, payload) {
  // payload.details.billingAddress
  // payload.details.shippingAddress
});
```

## Cancellation

```javascript
venmoInstance.cancelTokenization(function (err) {
  if (!err) console.log('Cancelled');
});
```

## isBrowserSupported Options

```javascript
venmoInstance.isBrowserSupported({
  allowNewBrowserTab: true,
  allowWebviews: true,
  allowDesktop: true
});
// Returns boolean
```

## Common Errors

| Code | Type | Fix |
|------|------|-----|
| `VENMO_NOT_ENABLED` | MERCHANT | Enable Venmo in Braintree control panel |
| `VENMO_APP_CANCELED` | CUSTOMER | User cancelled in Venmo app, allow retry |
| `VENMO_DESKTOP_CANCELED` | CUSTOMER | User closed QR modal, allow retry |
| `VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT` | CUSTOMER | User took >5 minutes, allow retry |
| `VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED` | CUSTOMER | Payment context expired, create new payment |
| `VENMO_TOKENIZATION_REQUEST_ACTIVE` | MERCHANT | Already tokenizing, wait for completion |
| `VENMO_ECD_DISABLED` | MERCHANT | Enable Enriched Customer Data in settings |
| `VENMO_INVALID_PROFILE_ID` | MERCHANT | Use valid profile ID from control panel |

## Polling Details

- **Mobile:** 250ms interval, 5-minute timeout, 3 max retries
- **Desktop QR:** 1-second interval, visual delay before close
- **Desktop web login:** No polling (popup-based)

## CSP Requirements

- `style-src`: Use `styleCspNonce` for dynamically injected styles
- `img-src`: `data:` URIs for QR code canvas
- `connect-src`: Braintree GraphQL endpoint for polling
