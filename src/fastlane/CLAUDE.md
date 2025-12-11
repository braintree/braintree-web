# Fastlane Component - CLAUDE.md

This file provides component-specific guidance for working with the Fastlane component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Fastlane component is a **loader wrapper** for PayPal's Fastlane SDK - a modern checkout and identity solution that provides frictionless guest checkout with optional account creation.

**Important:** This component is a thin wrapper that loads and initializes the external Fastlane SDK. The actual Fastlane functionality is provided by PayPal's Fastlane SDK, not by this braintree-web component.

**Key Features:**

- Loads external Fastlane SDK
- Provides Braintree platform integration
- Passes device data for fraud detection
- Environment-aware loading (production/sandbox)

**Docs:** [PayPal Fastlane Guide](https://developer.paypal.com/braintree/docs/guides/fastlane)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `fastlane.js` - SDK loader logic (loads external Fastlane script)
- `errors.js` - Fastlane error codes (1 error)

**Note:** This is a minimal component (3 files) that acts as a bridge to the external Fastlane SDK.

## How It Works

### Loading Flow

```
1. Create Fastlane Instance
   ↓
2. Load Fastlane SDK Script
   (from PayPal CDN)
   ↓
3. Initialize Fastlane SDK
   (with Braintree platform options)
   ↓
4. Return Fastlane SDK Instance
   ↓
5. Use Fastlane Identity/Checkout APIs
   (via returned instance)
```

### What This Component Does

**This component:**

- Loads the external Fastlane SDK script
- Configures Fastlane with Braintree authorization
- Passes device data for fraud protection
- Handles environment-specific loading (minified/unminified)

**This component does NOT:**

- Provide Fastlane checkout UI
- Handle Fastlane identity management
- Process Fastlane payments
- Document Fastlane APIs

## Basic Usage

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
    return braintree.fastlane.create({
      client: clientInstance,
      deviceData: dataCollectorInstance.deviceData,
    });
  })
  .then(function (fastlaneInstance) {
    // fastlaneInstance is the Fastlane SDK instance
    // Use Fastlane's identity and checkout APIs

    var identity = fastlaneInstance.identity;
    var profile = fastlaneInstance.profile;

    // See Fastlane documentation for available methods
  })
  .catch(function (err) {
    console.error("Error creating Fastlane:", err);
  });
```

## Configuration Options

### Creation Options

```javascript
braintree.fastlane.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  deviceData: deviceDataString, // Optional but recommended (from Data Collector)
});
```

**Options:**

- `client`: Braintree client instance
- `authorization`: Alternative to providing client
- `deviceData`: Device fingerprint for fraud detection (recommended)

## Methods

This component only has the `create()` method. The returned `fastlaneInstance` is the external Fastlane SDK instance with its own APIs.

### create()

Creates and loads the Fastlane SDK.

**Signature:**

```javascript
braintree.fastlane.create(options, callback);
// OR
braintree.fastlane.create(options).then(function (fastlaneInstance) {
  // Use Fastlane SDK
});
```

**Returns:**

- `Promise<FastlaneSDK>` - The Fastlane SDK instance

**Example:**

```javascript
braintree.fastlane
  .create({
    client: clientInstance,
    deviceData: dataCollectorInstance.deviceData,
  })
  .then(function (fastlaneSDK) {
    // This is PayPal's Fastlane SDK instance
    console.log("Fastlane loaded");

    // Use Fastlane APIs - see Fastlane documentation
    return fastlaneSDK.identity.lookupCustomerByEmail("customer@example.com");
  });
```

## Error Handling

### Error Codes

From `errors.js`:

**1. `FASTLANE_SDK_LOAD_ERROR`** (MERCHANT)

**When:** Failed to load Fastlane SDK script

**Causes:**

- Network error loading SDK
- CDN unavailable
- Invalid authorization
- Fastlane not enabled

**Fix:**

- Check network connectivity
- Verify Fastlane enabled in Braintree control panel
- Check browser console for script loading errors
- Verify authorization is valid

**Example:**

```javascript
braintree.fastlane.create(options).catch(function (err) {
  if (err.code === "FASTLANE_SDK_LOAD_ERROR") {
    console.error("Failed to load Fastlane SDK:", err.message);
    // Fall back to alternative checkout
  }
});
```

## Implementation Details

### SDK Loading

The component:

1. Determines environment (production/sandbox)
2. Loads minified SDK in production, unminified in dev/sandbox
3. Calls `window.braintree.fastlane.create()` (or `window.braintree._fastlane.create()`)
4. Passes platform options with Braintree integration

### Platform Options

The component automatically includes:

- `platform`: `"BT"` (Braintree)
- `authorization`: Braintree authorization token
- `client`: Braintree client instance
- `deviceData`: Device fingerprint
- `btSdkVersion`: Braintree SDK version

## Testing

### Sandbox Testing

Use sandbox authorization to load sandbox version of Fastlane:

```javascript
// Server provides sandbox client token
var SANDBOX_CLIENT_TOKEN = "eyJ..."; // From sandbox

braintree.client
  .create({
    authorization: SANDBOX_CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.fastlane.create({
      client: clientInstance,
    });
  })
  .then(function (fastlaneSDK) {
    // Sandbox Fastlane SDK loaded
  });
```

### Unit Tests

Location: `test/fastlane/unit/`

```bash
# All Fastlane tests
npm test fastlane

# Specific test
jest test/fastlane/unit/fastlane.js
```

## Fastlane SDK Documentation

**This component only loads the SDK. For actual Fastlane usage, see:**

- [PayPal Fastlane Documentation](https://developer.paypal.com/braintree/docs/guides/fastlane) - Official integration guide
- Fastlane SDK API Reference - Available after loading
- [Braintree Fastlane Guide](https://developer.paypal.com/braintree/docs/guides/fastlane/overview) - Braintree-specific setup

**Common Fastlane SDK features:**

- `identity.lookupCustomerByEmail()` - Check if customer exists
- `identity.triggerAuthenticationFlow()` - OTP authentication
- `profile.showCardSelector()` - Display saved cards
- `checkout.createOrder()` - Create checkout session
