# Venmo Component - CLAUDE.md

This file provides component-specific guidance for working with the Venmo component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Venmo component enables Venmo payments through multiple authentication flows optimized for different environments (mobile, desktop, webviews). It's one of the most complex components in the SDK due to its multi-platform support and various payment flows.

**Key Features:**

- Mobile app deep linking (iOS/Android)
- Desktop QR code flow
- Desktop web login (popup)
- Mobile web fallback
- Payment context API for improved UX
- Polling mechanisms for mobile flows
- Extensive browser/environment detection

**Docs:** [Braintree Venmo Guide](https://developer.paypal.com/braintree/docs/guides/venmo)

## Component Structure

### Directory Organization

- `external/` - Public API and desktop integration
  - `index.js` - Venmo Desktop factory
  - `venmo-desktop.js` - Desktop QR/web login implementation (TypeScript source)
  - `queries.js` - GraphQL queries for payment context

- `internal/` - UI components and iframe management
  - `index.js` - Internal entry point
  - `modal.js` - Desktop modal container
  - `modal-backdrop.js` - Modal overlay
  - `venmo-desktop-frame.js` - Desktop iframe coordinator
  - `ui-elements/` - Modular UI components
    - `base.js` - Base UI element class
    - `modal.js`, `modal-backdrop.js` - Modal components
    - `card-container.js` - Card-style UI container
    - `front-view.js`, `back-view.js` - Two-sided card views
    - `qr-code-view.js` - QR code display
    - `error-view.js` - Error messaging
    - `close-icon.js` - Close button
  - `vendor/node-qrcode.js` - QR code generation library

- `shared/` - Code used by both external and internal
  - `constants.js` - Venmo URLs and constants
  - `errors.js` - Error code definitions
  - `events.js` - Event name constants
  - `types.js` - Type definitions
  - `browser-detection.js` - Environment capability detection
  - `supports-venmo.js` - Venmo support checker
  - `get-venmo-url.js` - URL generator for auth flows
  - `web-login-backdrop.js` - Web login UI coordinator

- `venmo.js` - Main Venmo class implementation
- `index.js` - Component entry point with create() function

## Authentication Flows

### Flow Selection Logic

The Venmo component automatically selects the appropriate flow based on:

1. Platform (mobile vs desktop)
2. Environment (browser, webview, in-app)
3. Configuration options
4. Venmo app availability

### 1. Mobile App Deep Link Flow (Default Mobile)

**When Used:**

- Mobile device with Venmo app installed
- Default flow for iOS/Android

**Flow:**

1. User clicks "Pay with Venmo"
2. SDK opens Venmo URL (deep link)
3. Venmo app intercepts and opens
4. User authorizes in Venmo app
5. Venmo app returns to merchant page
6. SDK polls for payment result via GraphQL
7. Tokenization complete

**URL Types:**

```javascript
// From shared/constants.js:

// Opens Venmo app OR web login if app not installed
VENMO_APP_OR_MOBILE_AUTH_URL: "https://venmo.com/go/checkout";

// Opens Venmo app ONLY (dead-end if not installed)
VENMO_MOBILE_APP_AUTH_ONLY_URL: "https://venmo.com/braintree/checkout";

// Web login only (no app switching)
VENMO_WEB_LOGIN_URL: "https://account.venmo.com/go/web";
```

**Configuration:**

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowNewBrowserTab: true, // Allow opening in new tab
  allowWebviews: true, // Allow from webviews
  requireManualReturn: false, // Auto-return after auth
});
```

### 2. Mobile Web Fallback Flow

**When Used:**

- Mobile device without Venmo app
- `mobileWebFallBack: true` option enabled

**Flow:**

1. SDK detects no Venmo app
2. Opens web login URL in new window/tab
3. User logs into Venmo web
4. Authorizes payment
5. Returns to merchant page
6. Polling completes tokenization

**Configuration:**

```javascript
braintree.venmo.create({
  client: clientInstance,
  mobileWebFallBack: true, // Enable web fallback
  allowNewBrowserTab: true,
});
```

### 3. Desktop QR Code Flow

**When Used:**

- Desktop browser
- `allowDesktop: true` option enabled
- Default desktop mode

**Flow:**

1. User clicks "Pay with Venmo"
2. SDK displays modal with QR code
3. User scans QR code with phone
4. Opens Venmo app on phone
5. User authorizes in Venmo app
6. SDK polls for payment result
7. Modal closes, tokenization complete

**Implementation:**

- Uses `external/venmo-desktop.js` (TypeScript source from separate repo)
- QR code generated with `internal/vendor/node-qrcode.js`
- Polling interval: 1 second (configurable)
- Visual delay before completion: 2 seconds

**Configuration:**

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktop: true, // Enable desktop flow
  paymentMethodUsage: "single_use", // Required for desktop
});
```

### 4. Desktop Web Login Flow

**When Used:**

- Desktop browser
- `allowDesktopWebLogin: true` option enabled

**Flow:**

1. User clicks "Pay with Venmo"
2. SDK opens popup window
3. User logs into Venmo web
4. Authorizes payment in popup
5. Popup closes
6. Tokenization complete (no polling needed)

**Configuration:**

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktopWebLogin: true, // Enable web login popup
  styleCspNonce: "your-csp-nonce", // Required if using CSP
});
```

## Payment Context API

### Legacy vs New Flow

**Legacy Flow:**

- Direct tokenization on return
- Simpler but less flexible

**New Flow (Payment Context):**

- Uses payment context ID
- Required when `requireManualReturn` or in iframe
- Required with `paymentMethodUsage` option
- Better for complex flows

**When Payment Context is Used:**

```javascript
// Automatically enabled when:
this._shouldCreateVenmoPaymentContext =
  this._cannotHaveReturnUrls || // In iframe or requireManualReturn
  !this._shouldUseLegacyFlow; // paymentMethodUsage specified
```

### Creating Payment Context

```javascript
// GraphQL mutation from external/queries.js
mutation createVenmoPaymentContext($input: CreateVenmoPaymentContextInput!) {
  createVenmoPaymentContext(input: $input) {
    venmoPaymentContext {
      id
      status
      createdAt
      expiresAt
    }
  }
}
```

## Polling Mechanism

### Mobile Polling

**Purpose:** Check payment status after user returns from Venmo app

**Default Settings:**

```javascript
_mobilePollingInterval: 250,  // 250ms = 1/4 second
_mobilePollingExpiresThreshold: 300000,  // 5 minutes
```

**Polling Logic:**

1. User returns from Venmo app
2. SDK starts polling payment context API
3. Checks status every 250ms
4. Stops when:
   - Status = APPROVED (success)
   - Status = FAILED/CANCELED (error)
   - 5 minutes elapsed (timeout)
   - Max retries reached (3)

**Polling Query:**

```javascript
// From external/queries.js
query venmoPaymentContext($id: ID!) {
  node(id: $id) {
    ... on VenmoPaymentContext {
      id
      status
      paymentMethodId
    }
  }
}
```

### Desktop Polling

**Purpose:** Check payment status while QR code is displayed

**Settings:**

```javascript
VENMO_DESKTOP_POLLING_INTERVAL: 1000; // 1 second
```

**Flow:**

1. QR code displayed in modal
2. User scans and authorizes on phone
3. Desktop SDK polls every 1 second
4. On approval:
   - Wait 2 seconds (visual delay)
   - Close modal
   - Complete tokenization

## UI Element System

### Architecture

Venmo uses a modular UI element system for desktop flows:

**Base Class:** `internal/ui-elements/base.js`

- Common element creation/styling
- Event handling
- Lifecycle management

**UI Components:**

1. **Modal** (`modal.js`)
   - Fullscreen overlay
   - Manages backdrop and content
   - Close button integration

2. **Card Container** (`card-container.js`)
   - Card-style centered container
   - Flip animation support
   - Responsive sizing

3. **Front View** (`front-view.js`)
   - Initial view with QR code
   - "Scan to pay" messaging
   - Loading states

4. **Back View** (`back-view.js`)
   - Alternative view (error recovery)
   - "Try again" messaging

5. **QR Code View** (`qr-code-view.js`)
   - QR code canvas rendering
   - Uses node-qrcode library
   - Automatic regeneration

6. **Error View** (`error-view.js`)
   - Error messaging
   - Retry actions
   - Close integration

### CSP Nonces

For Content Security Policy compatibility:

```javascript
braintree.venmo.create({
  client: clientInstance,
  allowDesktopWebLogin: true,
  styleCspNonce: document.querySelector('meta[name="csp-nonce"]').content,
});
```

The nonce is applied to all dynamically created style elements.

## Browser Detection and Support

### Browser Capabilities

From `shared/browser-detection.js` and `shared/supports-venmo.js`:

**Checks:**

- iOS vs Android
- Safari vs Chrome vs Firefox vs other
- Webview detection (Instagram, Facebook, etc.)
- PopupBridge availability
- New tab support
- App switching capability

**isBrowserSupported Logic:**

```javascript
// Simplified logic:
if (desktop && allowDesktop) return true;
if (mobile && hasVenmoApp) return true;
if (mobile && mobileWebFallBack) return true;
if (webview && !allowWebviews) return false;
if (needsNewTab && !allowNewBrowserTab) return false;
// ... more checks
```

## Configuration Options

### Core Options

**Authorization:**

```javascript
{
  client: clientInstance,  // OR
  authorization: 'tokenization_key_or_client_token'
}
```

**Mobile Options:**

```javascript
{
  allowNewBrowserTab: true,  // Allow payment in new tab
  allowWebviews: true,  // Allow from webviews
  allowAndroidRecreation: true,  // Page refresh on Android
  allowNonDefaultBrowsers: true,  // Chrome on iOS, Firefox on Android
  requireManualReturn: false,  // User must manually return
  useRedirectForIOS: false,  // Use redirect instead of window.open
  ignoreHistoryChanges: false,  // Handle URL hash changes
  cancelOnReturnToBrowser: false  // Cancel if user returns early
}
```

**Desktop Options:**

```javascript
{
  allowDesktop: true,  // Enable desktop flows
  allowDesktopWebLogin: false,  // Use web login instead of QR
  styleCspNonce: 'nonce-value'  // CSP nonce for styles
}
```

**Mobile Web Fallback:**

```javascript
{
  mobileWebFallBack: true,  // Enable web login if no app
  styleCspNonce: 'nonce-value'  // Required with mobileWebFallBack
}
```

**Payment Context Options:**

```javascript
{
  paymentMethodUsage: 'single_use',  // or 'multi_use'
  profileId: 'venmo_profile_id',  // Merchant Venmo profile
  displayName: 'My Business'  // Business name in app
}
```

**Enriched Customer Data:**

```javascript
{
  collectCustomerBillingAddress: true,
  collectCustomerShippingAddress: true,
  isFinalAmount: false,  // Amount won't change
  totalAmount: '100.00',
  subTotalAmount: '90.00',
  taxAmount: '10.00',
  shippingAmount: '5.00',
  discountAmount: '5.00',
  lineItems: [
    {
      quantity: 2,
      unitAmount: '45.00',
      name: 'Widget',
      kind: 'debit',  // or 'credit'
      unitTaxAmount: '5.00',
      description: 'Premium widget',
      productCode: 'WIDGET-001',
      url: 'https://example.com/widget'
    }
  ]
}
```

## Error Handling

### Common Errors

From `shared/errors.js`:

**Creation Errors:**

1. **`VENMO_NOT_ENABLED`** (MERCHANT)
   - Venmo not enabled in Braintree control panel
   - Fix: Enable Venmo in merchant settings

2. **`VENMO_INVALID_PROFILE_ID`** (MERCHANT)
   - Invalid profileId provided
   - Fix: Use valid Venmo profile ID from control panel

3. **`VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED`** (UNKNOWN)
   - Failed to create payment context
   - Fix: Check network, retry

**Tokenization Errors:**

1. **`VENMO_APP_CANCELED`** (CUSTOMER)
   - User cancelled in Venmo app
   - Handling: Allow retry

2. **`VENMO_CUSTOMER_CANCELED`** (CUSTOMER)
   - User cancelled flow
   - Handling: Allow retry

3. **`VENMO_DESKTOP_CANCELED`** (CUSTOMER)
   - User closed desktop modal
   - Handling: Allow retry

4. **`VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT`** (CUSTOMER)
   - User took too long (>5 minutes)
   - Handling: Show timeout message, allow retry

5. **`VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED`** (CUSTOMER)
   - Payment context expired
   - Handling: Create new payment, retry

6. **`VENMO_TOKENIZATION_REQUEST_ACTIVE`** (MERCHANT)
   - Called tokenize() while already in progress
   - Fix: Track tokenization state, prevent duplicate calls

7. **`VENMO_ECD_DISABLED`** (MERCHANT)
   - Tried to access customer details without ECD enabled
   - Fix: Enable Enriched Customer Data in merchant settings

## Testing

### Unit Tests

Location: `test/venmo/unit/`

**Test Categories:**

- Flow detection logic
- Browser support detection
- Polling mechanisms
- Payment context creation
- UI element rendering
- Error handling

### Integration Tests

Location: `test/venmo/integration/`

**Test Scenarios:**

- Mobile app flow (simulated)
- Desktop QR flow
- Desktop web login flow
- Mobile web fallback
- Polling timeouts and expiration
- Error recovery

## Debugging

### Common Issues

**1. "Browser not supported"**

**Symptoms:**

- `isBrowserSupported()` returns false

**Debug:**

1. Check browser/environment with `shared/browser-detection.js`
2. Verify configuration options match environment
3. For webviews: Set `allowWebviews: true`
4. For desktop: Set `allowDesktop: true`
5. For non-default browsers: Set `allowNonDefaultBrowsers: true`

**2. Polling Never Completes**

**Symptoms:**

- Timeout after 5 minutes
- `VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT`

**Debug:**

1. Check payment context was created: Look for context ID in logs
2. Verify network requests to GraphQL API
3. Check if user actually completed auth in Venmo app
4. Test with shorter `_mobilePollingExpiresThreshold` for debugging

**3. Desktop QR Code Not Displaying**

**Symptoms:**

- Modal appears but no QR code

**Debug:**

1. Check browser console for QR code generation errors
2. Verify `node-qrcode` library loaded
3. Check CSP policy allows inline images (data URIs)
4. Verify payment context created successfully

**4. iOS Webview Shows Blank Screen**

**Symptoms:**

- White screen after clicking "Pay with Venmo"
- Flow halted

**Fix:**

```javascript
braintree.venmo.create({
  client: clientInstance,
  useRedirectForIOS: true, // Use redirect instead of window.open
  requireManualReturn: true, // User manually returns
});
```

**5. Popup Blocked (Desktop Web Login)**

**Symptoms:**

- `VENMO_DESKTOP_UNKNOWN_ERROR`
- No popup appears

**Debug:**

1. Ensure `tokenize()` called in direct response to user click
2. Check browser popup blocker settings
3. Test in different browser
4. Consider fallback to QR code flow

## Implementation Examples

### Basic Mobile Flow

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.venmo.create({
      client: clientInstance,
    });
  })
  .then(function (venmoInstance) {
    if (!venmoInstance.isBrowserSupported()) {
      console.log("Venmo not supported in this browser");
      return;
    }

    payWithVenmoButton.addEventListener("click", function () {
      venmoInstance.tokenize(function (err, payload) {
        if (err) {
          if (err.code === "VENMO_APP_CANCELED") {
            console.log("User cancelled");
          } else {
            console.error(err);
          }
          return;
        }

        // Send payload.nonce to server
        sendNonceToServer(payload.nonce);
      });
    });
  });
```

### Desktop QR Code Flow

```javascript
braintree.venmo
  .create({
    client: clientInstance,
    allowDesktop: true,
    paymentMethodUsage: "single_use",
    profileId: "my-venmo-profile-id",
  })
  .then(function (venmoInstance) {
    payButton.addEventListener("click", function () {
      venmoInstance.tokenize(function (err, payload) {
        if (err) {
          if (err.code === "VENMO_DESKTOP_CANCELED") {
            console.log("User closed QR modal");
          }
          return;
        }

        sendNonceToServer(payload.nonce);
      });
    });
  });
```

### Desktop Web Login Flow

```javascript
braintree.venmo
  .create({
    client: clientInstance,
    allowDesktopWebLogin: true,
    paymentMethodUsage: "single_use",
    styleCspNonce: document.querySelector('meta[name="csp-nonce"]').content,
  })
  .then(function (venmoInstance) {
    // Web login in popup, no QR code
    payButton.addEventListener("click", function () {
      venmoInstance.tokenize(function (err, payload) {
        if (err) return console.error(err);
        sendNonceToServer(payload.nonce);
      });
    });
  });
```

### With Enriched Customer Data

```javascript
venmoInstance.tokenize(
  {
    amount: "100.00",
    collectCustomerBillingAddress: true,
    collectCustomerShippingAddress: true,
    isFinalAmount: true,
    lineItems: [
      {
        quantity: 1,
        unitAmount: "100.00",
        name: "Premium Subscription",
        kind: "debit",
      },
    ],
  },
  function (err, payload) {
    if (err) return console.error(err);

    // Access enriched data
    console.log("Billing:", payload.details.billingAddress);
    console.log("Shipping:", payload.details.shippingAddress);

    sendNonceToServer(payload.nonce);
  }
);
```

### Cancelling Tokenization

```javascript
var tokenizationPromise = venmoInstance.tokenize();

// Later, if user navigates away or cancels
cancelButton.addEventListener("click", function () {
  venmoInstance.cancelTokenization(function (err) {
    if (err) {
      console.error("Error cancelling:", err);
    } else {
      console.log("Tokenization cancelled");
    }
  });
});
```
