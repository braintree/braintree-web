# Frame Service - CLAUDE.md

This file provides guidance for working with the Frame Service library. For project-wide conventions, see `/CLAUDE.md`.

## Overview

Frame Service manages secure iframe-based payment flows for components that require external UI (popups, modals) to complete payment authorization. It provides a standardized way to:

1. Open payment UI in a secure context (popup window or modal overlay)
2. Communicate between the main page and payment UI via framebus
3. Handle payment completion and errors
4. Manage different display strategies (popup, modal, PopupBridge)

**Components Using Frame Service:**

- `paypal` - PayPal login and authorization
- `paypal-checkout` - PayPal Checkout button integration
- `venmo` - Venmo web login backdrop
- `sepa` - SEPA mandate acceptance
- `local-payment` - Local payment methods (iDEAL, Sofort, etc.)
- `masterpass` - Masterpass (deprecated)

## Architecture

### Core Concept

Frame Service uses a **two-frame architecture**:

```
Merchant Page
├── Component (e.g., PayPal, Venmo)
│   └── FrameService instance
│       ├── Dispatch Frame (hidden iframe)
│       │   └── Coordinates communication
│       └── Open Frame (popup/modal)
│           └── Payment provider UI
```

### Directory Structure

- `external/` - Public API for components to use
  - `frame-service.js` - Main FrameService class
  - `index.js` - Module export
  - `strategies/` - Different display strategies
    - `popup/` - Popup window strategy
      - `index.js` - Popup implementation
      - `compose-options.js` - Popup window options
      - `position.js` - Popup positioning
    - `modal.js` - Modal overlay strategy
    - `popup-bridge.js` - Mobile app integration strategy

- `internal/` - Code that runs inside frames
  - `dispatch-frame.js` - Dispatch frame coordinator
  - `redirect-frame.js` - Handles redirect flows
  - `cancel-frame.js` - Handles cancellation
  - `index.js` - Internal entry point

- `shared/` - Code used by both external and internal
  - `events.js` - Event name constants
  - `errors.js` - Error code definitions
  - `constants.js` - Frame Service constants
  - `browser-detection.js` - Browser capability detection

## Frame Service Flow

### 1. Initialization

```javascript
var FrameService = require("../lib/frame-service/external/frame-service");

var frameService = new FrameService({
  name: "paypal", // Component name
  dispatchFrameUrl:
    "https://assets.braintreegateway.com/.../dispatch-frame.html",
  openFrameUrl: "https://assets.braintreegateway.com/.../landing-frame.html",
  height: 500,
  width: 400,
});

frameService.initialize(function () {
  // Dispatch frame is ready
});
```

**What happens:**

1. FrameService generates unique service ID
2. Creates hidden dispatch frame using `iFramer`
3. Dispatch frame loads and signals `DISPATCH_FRAME_READY`
4. Callback fires, Frame Service is ready to use

### 2. Opening Payment UI

```javascript
frameService.open({}, function (err, payload) {
  if (err) {
    // Handle error (user closed, timeout, etc.)
  } else {
    // Payment successful, process payload
  }
});
```

**What happens:**

1. Frame Service chooses strategy (Popup, Modal, or PopupBridge)
2. Strategy opens the payment UI
3. User interacts with payment provider (login, authorize, etc.)
4. Payment provider redirects back with result
5. Dispatch frame receives result via framebus
6. Callback fires with payload or error

### 3. Communication

All communication uses **framebus** (secure postMessage wrapper):

```
Merchant Page ←→ Dispatch Frame ←→ Open Frame ←→ Payment Provider
     ↑                                                      ↓
     └──────────────── Result via callback ←───────────────┘
```

**Key Events:**

- `DISPATCH_FRAME_READY` - Dispatch frame loaded and ready
- `DISPATCH_FRAME_REPORT` - Payment result (success or failure)

### 4. Cleanup

```javascript
frameService.close(); // Closes open frame
frameService.teardown(); // Full cleanup including dispatch frame
```

## Display Strategies

Frame Service supports three strategies for displaying payment UI:

### Popup Strategy

**File:** `external/strategies/popup/index.js`

Opens payment UI in a new browser window (most common):

```javascript
// Automatically selected by default
var popup = new Popup({
  name: "paypal_popup_12345",
  openFrameUrl: "https://...",
  height: 500,
  width: 400,
  top: 100,
  left: 100,
});

popup.open(); // Opens window.open()
popup.focus(); // Brings popup to front
popup.close(); // Closes popup
popup.isClosed(); // Check if user closed popup
```

**Features:**

- User can see browser chrome (address bar)
- More trustworthy (users can verify domain)
- Popup blockers may interfere
- Position calculated by `position.js`
- Window features composed by `compose-options.js`

**When Used:**

- Desktop browsers (default strategy)
- PayPal, Venmo, most payment methods

### Modal Strategy

**File:** `external/strategies/modal.js`

Opens payment UI as an iframe overlay on the same page:

```javascript
var modal = new Modal({
  name: "paypal_modal_12345",
  openFrameUrl: "https://...",
  container: document.body, // Optional, defaults to body
});

modal.open(); // Creates fullscreen iframe overlay
modal.close(); // Removes iframe
```

**Features:**

- Fullscreen iframe overlay (z-index: 20001)
- No popup blockers
- User cannot verify domain (less trustworthy)
- Special handling for iOS WKWebView scrolling

**When Used:**

- WebViews (e.g., Facebook in-app browser)
- Environments where popups are blocked
- Legacy PayPal SDK compatibility

**Security Note:** From `modal.js:24`:

> "We should not ever really use the Modal. Modals are _like_ popups, but the key difference is that the customer can't actually verify it's app domain and thus secure/valid."

### PopupBridge Strategy

**File:** `external/strategies/popup-bridge.js`

Integrates with native mobile apps using [PopupBridge](https://github.com/braintree/popup-bridge):

```javascript
// Detected automatically if window.popupBridge exists
var bridge = new PopupBridge({
  name: "paypal_bridge",
  openFrameUrl: "https://...",
});

bridge.open(); // Calls popupBridge.open()
```

**Features:**

- Opens payment UI in native browser (Safari/Chrome)
- Seamless return to app after authorization
- Best UX for mobile apps
- Requires PopupBridge integration in native app

**When Used:**

- Mobile apps with PopupBridge SDK installed
- iOS and Android native apps

## Browser Compatibility

**Popup Blockers:**

- Popups must be opened in response to user interaction
- Components should call `frameService.open()` directly in click handler
- Delayed calls may be blocked

**iOS WKWebView:**

- Modal strategy has special scrolling workaround (`_lockScrolling()`)
- Position is absolute instead of fixed

**Browser Detection:**
`shared/browser-detection.js` detects:

- iOS (Safari, WKWebView)
- Android
- Popup blocker presence

## Error Handling

**Frame Service Errors:**

From `shared/errors.js`:

1. **`FRAME_SERVICE_FRAME_CLOSED`**
   - Type: `INTERNAL`
   - Message: "Frame closed before tokenization could occur."
   - Cause: User closed popup/modal before completing payment
   - Handling: Treat as cancellation, allow retry

2. **`FRAME_SERVICE_FRAME_OPEN_FAILED`**
   - Type: `INTERNAL`
   - Message: "Frame failed to open."
   - Cause: Popup blocker, browser restrictions, or invalid URL
   - Handling: Show error message, suggest enabling popups

**Example Error Handling:**

```javascript
frameService.open({}, function (err, payload) {
  if (err) {
    if (err.code === "FRAME_SERVICE_FRAME_OPEN_FAILED") {
      // Show popup blocker message
      alert("Please enable popups for this site");
    } else if (err.code === "FRAME_SERVICE_FRAME_CLOSED") {
      // User cancelled
      console.log("Payment cancelled by user");
    }
  } else {
    // Process payload
  }
});
```

## Testing

### Unit Tests

Location: `test/lib/frame-service/unit/`

**Test Categories:**

- External API tests (`external/frame-service.js`)
- Strategy tests (`external/strategies/*.js`)
- Internal frame tests (`internal/*.js`)
- Browser detection tests

### Integration Tests

Test actual frame opening and communication:

- Popup window creation and closure
- Modal overlay display
- Framebus event flow
- Error scenarios (popup blocked, user closed)

## Debugging

### Common Issues

**1. Popup Blocked**

**Symptoms:**

- `FRAME_SERVICE_FRAME_OPEN_FAILED` error
- No popup appears

**Debug:**

- Check browser console for popup blocker warnings
- Ensure `open()` is called in response to user click
- Test in different browser
- Check popup blocker settings

**2. Frame Communication Failure**

**Symptoms:**

- Callback never fires
- Timeout errors

**Debug:**

1. Open browser console, check for framebus errors
2. Verify dispatch frame loaded: Look for hidden iframe in DOM
3. Check Network tab: dispatch frame URL should load successfully
4. Enable `BRAINTREE_JS_ENV=development` for verbose logging
5. Test with `Bus.logBusMessages()` to see framebus traffic

**3. Modal Scrolling Issues (iOS)**

**Symptoms:**

- Modal doesn't scroll on iOS
- Background page scrolls instead

**Fix:**

- Modal strategy automatically applies `_lockScrolling()` for WKWebView
- Check `browserDetection.isIosWKWebview()` is working
- Verify scroll lock/unlock in `modal.js`

**4. State Not Passing Correctly**

**Symptoms:**

- Payment data missing in callback

**Debug:**

- Check `state` option passed to FrameService constructor
- State is available at `frameService.state`
- Verify dispatch frame is receiving state via framebus

## Implementation Examples

### Basic Usage (PayPal)

```javascript
var FrameService = require("../lib/frame-service/external/frame-service");

function createPayPalFrameService(config) {
  var frameService = new FrameService({
    name: "braintree_paypal",
    dispatchFrameUrl: config.assetsUrl + "/web/3.x/html/dispatch-frame.html",
    openFrameUrl: config.assetsUrl + "/web/3.x/html/paypal-landing-frame.html",
  });

  return new Promise(function (resolve) {
    frameService.initialize(function () {
      resolve(frameService);
    });
  });
}

// Later, when user clicks "Pay with PayPal"
frameService.open({}, function (err, payload) {
  if (err) {
    handleError(err);
  } else {
    // payload contains nonce and other data
    submitPayment(payload.nonce);
  }
});
```

### With State Management (Venmo)

```javascript
var frameService = new FrameService({
  name: "venmo",
  dispatchFrameUrl: assetsUrl + "/dispatch-frame.html",
  openFrameUrl: assetsUrl + "/venmo-landing.html",
  state: {
    // State accessible to all frames
    merchantId: "merchant_id_123",
    profileId: "profile_id_456",
  },
});
```

### Custom Dimensions (SEPA)

```javascript
var frameService = new FrameService({
  name: "sepa",
  dispatchFrameUrl: "...",
  openFrameUrl: "...",
  height: 600, // Taller for SEPA mandate
  width: 450,
  top: 100,
  left: 200,
});
```
