# Data Collector Component - CLAUDE.md

This file provides component-specific guidance for working with the Data Collector component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

Data Collector gathers device information for fraud detection and risk assessment. It integrates with **PayPal's Fraudnet** service to collect device fingerprints that correlate user sessions with transactions on your server.

**Key Features:**

- Device fingerprinting via PayPal Fraudnet
- Session correlation for fraud prevention
- Automatic script loading and initialization
- Cached session management
- Optional deferred client creation

**Docs:** [Braintree Fraud Tools Guide](https://developer.paypal.com/braintree/docs/guides/fraud-tools)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `fraudnet.js` - Fraudnet integration and script loading
- `errors.js` - Data Collector error codes

**Note:** This is a simple component (3 files) with focused functionality.

## How It Works

### Device Fingerprinting

```
1. create() Called
   ↓
2. Fraudnet Script Loaded
   (https://www.paypalobjects.com/webstatic/r/fb/fb-all-prod.pp2.min.js)
   ↓
3. Configuration Block Injected
   (JSON script tag with session ID)
   ↓
4. Fraudnet Collects Device Data
   (browser, device, network info)
   ↓
5. deviceData Available
   (correlation_id to send with transactions)
```

### What Gets Collected

Fraudnet collects (PayPal-controlled):

- Browser type and version
- Screen resolution and color depth
- Timezone
- Language settings
- Plugins and features
- Flash version (if available)
- Java enabled status
- Other device characteristics

**Privacy:** No personally identifiable information (PII) is collected.

### Session Correlation

**Purpose:** Link client-side activity with server-side transactions for fraud analysis

**Flow:**

1. Data Collector generates/uses correlation ID (session ID)
2. Device data collected and associated with correlation ID
3. Merchant sends correlation ID (`deviceData`) to server with transaction
4. Braintree correlates device fingerprint with transaction for risk assessment

## Basic Usage

### Create Data Collector

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.dataCollector.create({
      client: clientInstance,
    });
  })
  .then(function (dataCollectorInstance) {
    // Device data is ready
    var deviceData = dataCollectorInstance.deviceData;

    // Send to server with payment method nonce
    submitToServer({
      nonce: paymentNonce,
      deviceData: deviceData,
    });
  });
```

### Recommended: Create Early

For best fraud detection, create Data Collector as **early as possible** in the customer journey:

```javascript
// On page load
window.addEventListener("DOMContentLoaded", function () {
  braintree.client
    .create({
      authorization: CLIENT_TOKEN,
    })
    .then(function (clientInstance) {
      return braintree.dataCollector.create({
        client: clientInstance,
      });
    })
    .then(function (dataCollectorInstance) {
      // Store instance for later use
      window.dataCollectorInstance = dataCollectorInstance;
    });
});

// Later, when customer makes purchase
submitButton.addEventListener("click", function () {
  submitToServer({
    nonce: paymentNonce,
    deviceData: window.dataCollectorInstance.deviceData,
  });
});
```

## Configuration Options

### Basic Options

```javascript
braintree.dataCollector.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
});
```

### Advanced Options

**Custom Risk Correlation ID:**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  riskCorrelationId: "custom-session-id-123", // Custom correlation ID
});
```

Use cases:

- Link multiple page loads to same session
- Custom session tracking
- Server-generated session IDs

**Deferred Client Creation:**

```javascript
// For immediate Data Collector availability
braintree.dataCollector
  .create({
    authorization: CLIENT_TOKEN,
    useDeferredClient: true, // Client created in background
  })
  .then(function (dataCollectorInstance) {
    // Instance available immediately
    // deviceData not available until getDeviceData() resolves

    dataCollectorInstance.getDeviceData().then(function (deviceData) {
      // Device data ready
    });
  });
```

**Beacon Control:**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  beacon: false, // Disable beacon tracking (default: true)
});
```

**Callback Parameter:**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  cb1: "myCallbackFunction", // Custom callback on Fraudnet init
});
```

When Fraudnet finishes initializing, calls `window.myCallbackFunction()`.

## Device Data

### Getting Device Data

**Immediate Access (if created with client):**

```javascript
var deviceData = dataCollectorInstance.deviceData;
// '{"correlation_id":"abc123..."}'
```

**Using getDeviceData():**

```javascript
// Always works, especially with useDeferredClient
dataCollectorInstance.getDeviceData().then(function (deviceData) {
  // Device data as JSON string
  submitToServer(deviceData);
});
```

**Raw Format:**

```javascript
dataCollectorInstance
  .getDeviceData({
    raw: true,
  })
  .then(function (deviceDataObject) {
    // Device data as object
    console.log(deviceDataObject.correlation_id);
  });
```

### Device Data Format

**String Format (default):**

```javascript
'{"correlation_id":"abc123def456..."}';
```

**Raw Object Format:**

```javascript
{
  correlation_id: "abc123def456...";
}
```

**Note:** Correlation ID is truncated to 32 characters max.

## Implementation Details

### Session ID Management

**Session ID Sources (priority order):**

1. Custom `riskCorrelationId` (if provided)
2. `clientMetadataId` (deprecated, for backwards compatibility)
3. `correlationId` (deprecated, for backwards compatibility)
4. Client's analytics session ID (from gateway configuration)

**Truncation:**

```javascript
// From fraudnet.js:38
this.sessionId = this.sessionId.substring(0, 32);
```

All session IDs truncated to 32 characters.

### Fraudnet Script Loading

**Script URL:**

```javascript
// From ../lib/constants.js
FRAUDNET_URL =
  "https://www.paypalobjects.com/webstatic/r/fb/fb-all-prod.pp2.min.js";
```

**Configuration Block:**

```javascript
// Injected as <script type="application/json"> tag
{
  f: "session-id-123",      // Session/correlation ID
  s: "braintree_web_sdk",   // Source identifier
  b: "https://b.stats.paypal.com/counter.cgi?...",  // Beacon URL (if enabled)
  sandbox: true  // Only in non-production environments
}
```

**Attributes:**

```html
<script
  type="application/json"
  fncls="fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99"
>
  { "f": "session-id", "s": "braintree_web_sdk", "b": "https://..." }
</script>
```

### Script Loading Resilience

**Important:** If Fraudnet script fails to load, Data Collector still succeeds:

```javascript
// From fraudnet.js:73-78
.catch(function () {
  // if the fraudnet script fails to load
  // we just resolve with nothing
  // and data collector ignores it
  return null;
});
```

**Result:** `deviceData` will be empty string if Fraudnet unavailable, but component won't error.

### Caching

**Session ID Caching:**

```javascript
// From fraudnet.js:10, 17-20
var cachedSessionId;

if (!options.sessionId && cachedSessionId) {
  fraudNet.sessionId = cachedSessionId;
  return Promise.resolve(fraudNet);
}
```

**Purpose:** Reuse session ID across multiple Data Collector instances on same page.

**Clearing Cache:**

```javascript
// Internal use only (testing)
require("./fraudnet").clearSessionIdCache();
```

## Teardown

### Cleanup

```javascript
dataCollectorInstance.teardown().then(function () {
  // Fraudnet iframes and scripts removed
  // Instance methods converted to errors
});
```

**What Gets Removed:**

- Fraudnet iframes (`ppfniframe`, `pbf`)
- Parameter block script tag
- Third-party script tag

## Error Handling

### Error Codes

From `errors.js`:

**1. `DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS`** (MERCHANT)

**When:** Fraudnet setup failed and no data collector instances created

**Cause:**

- Fraudnet disabled/unavailable
- Configuration issue

**Handling:**
This error indicates no device data will be collected. You can:

- Proceed without device data (reduced fraud protection)
- Retry Data Collector creation
- Log error for monitoring

**Note:** This error is rare - script loading failure doesn't trigger it (handled gracefully).

## Testing

### Unit Tests

Location: `test/data-collector/unit/`

**Test Categories:**

- Component creation
- Fraudnet initialization
- Session ID management
- Device data retrieval (sync and async)
- Teardown behavior
- Deferred client creation
- Error scenarios

### Integration Tests

Tests actual Fraudnet integration (mocked):

- Script loading
- Configuration block creation
- Device data format
- Multiple instances

## Debugging

### Common Issues

**1. No Device Data**

**Symptoms:**

- `deviceData` is empty string `""`
- `rawDeviceData` is empty object `{}`

**Causes:**

- Fraudnet script failed to load (network issue, ad blocker)
- Fraudnet disabled in environment

**Debug:**

1. Check browser console for script loading errors
2. Verify network request to `paypalobjects.com`
3. Check for ad blockers or privacy extensions
4. Inspect DOM for Fraudnet iframes (`ppfniframe`, `pbf`)

**Fix:**

- Data Collector gracefully handles this - proceed without device data
- Server-side: Transaction will process but with reduced fraud detection

**2. CSP (Content Security Policy) Blocks Fraudnet**

**Symptoms:**

- CSP errors in console
- Fraudnet script won't load

**Fix:**

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  script-src 'self' https://www.paypalobjects.com;
  frame-src https://www.paypal.com;
  img-src https://b.stats.paypal.com;
  connect-src https://www.paypal.com;
"
/>
```

Required CSP allowances:

- `script-src`: `https://www.paypalobjects.com` (Fraudnet script)
- `frame-src`: `https://www.paypal.com` (Fraudnet iframes)
- `img-src`: `https://b.stats.paypal.com` (Beacon tracking)

**3. Deferred Client Device Data Not Ready**

**Symptoms:**

- `deviceData` undefined with `useDeferredClient: true`

**Fix:**

```javascript
// Don't access deviceData directly
// BAD:
var deviceData = dataCollectorInstance.deviceData; // undefined!

// GOOD:
dataCollectorInstance.getDeviceData().then(function (deviceData) {
  // Device data ready
});
```

## Implementation Examples

### Basic Integration

```javascript
// Create early in checkout flow
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.dataCollector.create({
      client: clientInstance,
    });
  })
  .then(function (dataCollectorInstance) {
    // Store for later
    window.dataCollector = dataCollectorInstance;
  });

// Later, when submitting payment
hostedFieldsInstance.tokenize(function (err, payload) {
  if (err) return handleError(err);

  fetch("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nonce: payload.nonce,
      deviceData: window.dataCollector.deviceData, // Include device data
    }),
  });
});
```

### With Deferred Client

```javascript
// Immediate availability without waiting for client
braintree.dataCollector
  .create({
    authorization: CLIENT_TOKEN,
    useDeferredClient: true,
  })
  .then(function (dataCollectorInstance) {
    window.dataCollector = dataCollectorInstance;

    // Instance ready, but device data not yet available
    // Use getDeviceData() when needed
  });

// Later
window.dataCollector.getDeviceData().then(function (deviceData) {
  submitPayment(deviceData);
});
```

### Custom Session Tracking

```javascript
// Generate session ID on server
var sessionId = generateSessionIdOnServer(); // e.g., UUID

// Use same session across page loads
braintree.dataCollector
  .create({
    client: clientInstance,
    riskCorrelationId: sessionId,
  })
  .then(function (dataCollectorInstance) {
    // All page loads with same sessionId will correlate
    console.log(dataCollectorInstance.deviceData);
    // '{"correlation_id":"<sessionId truncated to 32 chars>"}'
  });
```

### With Error Handling

```javascript
braintree.dataCollector
  .create({
    client: clientInstance,
  })
  .then(function (dataCollectorInstance) {
    window.dataCollector = dataCollectorInstance;
  })
  .catch(function (err) {
    if (err.code === "DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS") {
      // Fraudnet unavailable - proceed without device data
      console.warn("Device data unavailable:", err);
      window.dataCollector = null;
    } else {
      console.error("Unexpected error:", err);
    }
  });

// Later, safely get device data
function getDeviceData() {
  if (window.dataCollector) {
    return window.dataCollector.deviceData;
  }
  return ""; // Empty device data if unavailable
}
```

### Server-Side Usage

**Client-side:**

```javascript
submitButton.addEventListener("click", function () {
  hostedFieldsInstance.tokenize(function (err, payload) {
    fetch("/checkout", {
      method: "POST",
      body: JSON.stringify({
        nonce: payload.nonce,
        deviceData: dataCollectorInstance.deviceData,
      }),
    });
  });
});
```

**Server-side (Node.js example):**

```javascript
// Receive device data from client
app.post("/checkout", function (req, res) {
  var nonce = req.body.nonce;
  var deviceData = req.body.deviceData;

  // Create transaction with device data
  gateway.transaction.sale(
    {
      amount: "10.00",
      paymentMethodNonce: nonce,
      deviceData: deviceData, // Include for fraud detection
      options: {
        submitForSettlement: true,
      },
    },
    function (err, result) {
      if (result.success) {
        res.send({ success: true });
      } else {
        res.status(500).send({ error: result.message });
      }
    }
  );
});
```

## Advanced Topics

### Fraudnet Constants

**From `../lib/constants.js`:**

```javascript
FRAUDNET_URL =
  "https://www.paypalobjects.com/webstatic/r/fb/fb-all-prod.pp2.min.js";
FRAUDNET_SOURCE = "braintree_web_sdk";
FRAUDNET_FNCLS = "fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99";
```

**FNCLS:** Unique identifier for Fraudnet configuration block

### Beacon Tracking

**Beacon URL (if enabled):**

```javascript
https://b.stats.paypal.com/counter.cgi?i=127.0.0.1&p=<sessionId>&t=<timestamp>&a=14
```

**Purpose:**

- Track page load timing
- Collect additional analytics

**Disable:**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  beacon: false, // No beacon request
});
```

### Environment Handling

**Sandbox vs Production:**

```javascript
// From fraudnet.js:116
if (environment !== "production") {
  config.sandbox = true;
}
```

**Effect:** Fraudnet script behavior varies by environment (sandbox for testing, production for live transactions).

## Best Practices

1. **Create Early:** Initialize Data Collector as soon as checkout begins, not just before payment
2. **Include Always:** Always send `deviceData` with transactions when available
3. **Don't Block:** Don't block payment if device data unavailable - proceed with empty string
4. **Test Thoroughly:** Test in sandbox with various browsers and privacy settings
5. **Monitor:** Log when device data is unavailable to track ad blocker rates
