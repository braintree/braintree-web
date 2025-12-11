# Three-D-Secure Component - CLAUDE.md

This file provides component-specific guidance for working with the 3D Secure component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

Three-D-Secure (3DS) provides additional authentication for credit card transactions, reducing fraud and shifting liability. This component integrates with Cardinal Commerce's Songbird.js SDK to provide 3D Secure 2.0 authentication flows.

**Important:** As of recent versions, only 3D Secure v2 is supported. Version 1 has been deprecated and removed.

**Docs:** [Braintree 3D Secure Guide](https://developer.paypal.com/braintree/docs/guides/3d-secure)

## Component Structure

### Directory Organization

- `external/` - Public API exposed to merchants
  - `three-d-secure.js` - Main ThreeDSecure class
  - `frameworks/` - Different UI presentation frameworks
    - `base.js` - Abstract base framework class
    - `songbird.js` - Cardinal Songbird SDK integration (v2)
    - `cardinal-modal.js` - Default modal display (extends Songbird)
    - `bootstrap3-modal.js` - Bootstrap 3 styled modal
    - `inline-iframe.js` - Provides iframe to merchant for custom placement
    - `index.js` - Framework factory

- `internal/` - Internal iframe implementations
  - `index.js` - Internal entry point
  - `bank-frame.js` - Handles bank authentication iframe (v1 legacy)
  - `authentication-complete-frame.js` - Post-authentication processing

- `shared/` - Shared code
  - `errors.js` - 3DS error code definitions
  - `events.js` - Event name constants
  - `constants.js` - 3DS constants (frame names, etc.)

## Version Support

### 3D Secure Version 2 (Current)

**Supported Versions:**

- `'2'` - Default Cardinal modal (most common)
- `'2-bootstrap3-modal'` - Bootstrap 3 styled modal
- `'2-inline-iframe'` - Merchant-controlled iframe placement

**Key Features:**

- Uses Cardinal Commerce Songbird.js SDK
- Better user experience (less friction)
- Risk-based authentication (not all transactions require challenge)
- Support for frictionless flows
- Support for SCA (Strong Customer Authentication) exemptions

### 3D Secure Version 1 (Deprecated)

Version 1 support has been removed. Merchants must use version 2.

**Migration:** Merchants still using v1 should:

1. Update to use `version: '2'` in create options
2. Update event listeners (v2 has different events)
3. Test authentication flows

## Cardinal Songbird Integration

### Cardinal SDK Setup

The component automatically loads Cardinal's Songbird.js SDK:

**Flow:**

1. Component loads Songbird.js from Cardinal CDN
2. Configures Cardinal with JWT from Braintree API
3. Cardinal initializes and provides device fingerprinting
4. Ready for authentication flows

**Configuration Options:**

```javascript
braintree.threeDSecure.create(
  {
    client: clientInstance,
    version: "2",
    cardinalSDKConfig: {
      logging: {
        level: "verbose", // 'on', 'verbose', 'off'
      },
      timeout: 10000, // Milliseconds to wait for Cardinal API
      maxRequestRetries: 3, // Cardinal API retry attempts
      payment: {
        displayLoading: false, // Show loading indicator
        displayExitButton: true, // Show X button in v1 fallback modal
      },
    },
  },
  callback
);
```

### Device Fingerprinting

Cardinal performs device fingerprinting automatically:

```javascript
// Internal: framework calls this
threeDSecureInstance.getDfReferenceId().then(function (dfReferenceId) {
  // Device fingerprint ID to send with lookup
});
```

**Purpose:**

- Collects device information for risk assessment
- Helps determine if challenge is needed
- Required for all v2 lookups

## Authentication Flow

### Overview

```
1. Tokenize Card → 2. Lookup → 3. Challenge (if needed) → 4. Verification Complete
   (Hosted Fields)    (Braintree API)   (Cardinal)          (New nonce)
```

### Step 1: Tokenize Card

Use Hosted Fields or another method to get initial nonce:

```javascript
hostedFieldsInstance.tokenize(function (err, payload) {
  var nonce = payload.nonce;
  var bin = payload.details.bin;

  // Pass to 3DS verifyCard
});
```

### Step 2: 3DS Lookup

Call `verifyCard` with nonce and transaction details:

```javascript
threeDSecureInstance.verifyCard(
  {
    nonce: nonce, // From tokenization
    bin: bin, // First 6 digits of card
    amount: "100.00", // Transaction amount (required)

    // Optional: customer information
    email: "customer@example.com",
    mobilePhoneNumber: "5551234567",
    billingAddress: {
      givenName: "John",
      surname: "Doe",
      streetAddress: "123 Main St",
      locality: "Chicago",
      region: "IL",
      postalCode: "60606",
      countryCodeAlpha2: "US",
    },

    // Optional: additional data
    additionalInformation: {
      shippingGivenName: "Jane",
      shippingAddress: {
        /* ... */
      },
    },
  },
  callback
);
```

**What happens:**

1. Component sends lookup request to Braintree API
2. Braintree contacts card issuer for authentication requirements
3. `lookup-complete` event fires with results

### Step 3: Handle Lookup Complete

```javascript
threeDSecureInstance.on("lookup-complete", function (data, next) {
  // data.requiresUserAuthentication: true if challenge needed
  // data.threeDSecureInfo.liabilityShifted: true if liability shifted
  // data.threeDSecureInfo.liabilityShiftPossible: true if challenge could help

  console.log("Requires challenge:", data.requiresUserAuthentication);
  console.log("Liability shifted:", data.threeDSecureInfo.liabilityShifted);

  // Call next() to proceed with challenge (if required)
  // Or handle frictionless flow
  next();
});
```

**Scenarios:**

**A) Frictionless (No Challenge):**

- `requiresUserAuthentication: false`
- `liabilityShifted: true`
- User is not challenged, authentication complete
- Final nonce in `verifyCard` callback

**B) Challenge Required:**

- `requiresUserAuthentication: true`
- Calling `next()` presents Cardinal modal/iframe
- User completes challenge
- Final nonce in `verifyCard` callback

**C) Authentication Not Available:**

- `liabilityShiftPossible: false`
- 3DS not available for this card
- Transaction can still proceed (merchant assumes liability)

### Step 4: Challenge Presentation

If challenge required, Cardinal modal appears automatically (version `'2'`):

**Modal Events:**

```javascript
threeDSecureInstance.on("authentication-modal-render", function () {
  // Modal appeared
});

threeDSecureInstance.on("authentication-modal-close", function () {
  // Modal closed (user completed or cancelled)
});
```

**Inline Iframe (version `'2-inline-iframe'):**

```javascript
threeDSecureInstance.on(
  "authentication-iframe-available",
  function (event, next) {
    var element = event.element; // Container with iframe

    // Add to your page
    document.getElementById("3ds-container").appendChild(element);

    // Signal that element is on page
    next();
  }
);
```

### Step 5: Verification Complete

```javascript
threeDSecureInstance.verifyCard(
  {
    // ... options
  },
  function (err, payload) {
    if (err) {
      // Handle error
      console.error(err);
      return;
    }

    // Success! Use new nonce
    var newNonce = payload.nonce;

    // payload.threeDSecureInfo has authentication details
    console.log(
      "Liability shifted:",
      payload.threeDSecureInfo.liabilityShifted
    );
    console.log("3DS version:", payload.threeDSecureInfo.threeDSecureVersion);

    // Send nonce to server
    submitToServer(newNonce);
  }
);
```

**Important:** The nonce from `verifyCard` is NEW and different from the original. The original nonce is consumed during the lookup process.

## Frameworks

### Cardinal Modal (Default)

**File:** `external/frameworks/cardinal-modal.js`

Extends Songbird framework to display authentication in Cardinal's native modal.

**Version:** `'2'`

**Features:**

- Managed by Cardinal SDK
- Responsive design
- Handles all UI states (loading, challenge, completion)
- Auto-positioning

**Use When:** Default choice for most integrations

### Bootstrap 3 Modal

**File:** `external/frameworks/bootstrap3-modal.js`

Displays authentication in a Bootstrap 3 styled modal.

**Version:** `'2-bootstrap3-modal'`

**Requirements:**

- Bootstrap 3 CSS must be loaded
- Bootstrap 3 JS must be loaded
- jQuery must be loaded

**Features:**

- Consistent with Bootstrap 3 site design
- Uses Bootstrap modal component

**Use When:** Site already uses Bootstrap 3

### Inline Iframe

**File:** `external/frameworks/inline-iframe.js`

Provides iframe element to merchant for custom placement.

**Version:** `'2-inline-iframe'`

**Features:**

- Merchant controls iframe placement
- Merchant controls styling of container
- More flexible UX

**Event Flow:**

```javascript
threeDSecureInstance.on(
  "authentication-iframe-available",
  function (event, next) {
    // event.element: DOM element containing iframe
    // Add to your page
    document.body.appendChild(event.element);

    // Must call next() to proceed
    next();
  }
);

threeDSecureInstance.on("authentication-iframe-unavailable", function () {
  // Remove iframe from page
  // Called after authentication completes or errors
});
```

**Use When:** Custom UI/UX required

## SCA Exemptions

3D Secure v2 supports Strong Customer Authentication (SCA) exemptions for European regulations.

**Exemption Types:**

```javascript
threeDSecureInstance.verifyCard(
  {
    nonce: nonce,
    amount: "10.00",
    requestedExemptionType: "low_value", // or 'transaction_risk_analysis'
  },
  callback
);
```

**`'low_value'`:**

- For transactions under €30
- Card issuer may skip challenge

**`'transaction_risk_analysis'`:**

- Merchant/acquirer performs risk analysis
- Low-risk transactions may skip challenge

**Note:** Exemptions are requests, not guarantees. Card issuer makes final decision.

## Error Handling

### Common Errors

From `shared/errors.js`:

**Creation Errors:**

1. **`THREEDS_NOT_ENABLED`**
   - Type: `MERCHANT`
   - Cause: 3DS not enabled in Braintree control panel
   - Fix: Contact Braintree support to enable 3DS

2. **`THREEDS_NOT_ENABLED_FOR_V2`**
   - Type: `MERCHANT`
   - Cause: Merchant not enabled for 3DS v2
   - Fix: Contact Braintree support

3. **`THREEDS_HTTPS_REQUIRED`**
   - Type: `MERCHANT`
   - Cause: Using 3DS over HTTP in production
   - Fix: Use HTTPS

4. **`THREEDS_CAN_NOT_USE_TOKENIZATION_KEY`**
   - Type: `MERCHANT`
   - Cause: Using tokenization key instead of client token
   - Fix: Generate and use client token

5. **`THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED`**
   - Type: `NETWORK`
   - Cause: Songbird.js failed to load
   - Fix: Check network, CDN availability, CSP policy

6. **`THREEDS_CARDINAL_SDK_SETUP_FAILED`**
   - Type: `UNKNOWN`
   - Cause: Cardinal SDK initialization failed
   - Fix: Check browser console, Cardinal configuration

7. **`THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT`**
   - Type: `UNKNOWN`
   - Cause: Cardinal took >60s to initialize
   - Fix: Check network conditions

**Verification Errors:**

1. **`THREEDS_AUTHENTICATION_IN_PROGRESS`**
   - Type: `MERCHANT`
   - Cause: Called `verifyCard` while another verification running
   - Fix: Wait for current verification to complete

2. **`THREEDS_MISSING_VERIFY_CARD_OPTION`**
   - Type: `MERCHANT`
   - Cause: Required option missing (nonce, bin, or amount)
   - Fix: Provide all required options

3. **`THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR`**
   - Type: `MERCHANT`
   - Cause: Nonce doesn't exist or already consumed
   - Fix: Use fresh nonce from tokenization

4. **`THREEDS_LOOKUP_VALIDATION_ERROR`**
   - Type: `CUSTOMER`
   - Cause: Card issuer rejected lookup (invalid data)
   - Fix: Verify customer/billing information

5. **`THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT`**
   - Type: `MERCHANT`
   - Cause: Merchant called `cancelVerifyCard()`
   - Handling: Expected when merchant cancels flow

6. **`THREEDS_CARDINAL_SDK_CANCELED`**
   - Type: `CUSTOMER`
   - Cause: Customer cancelled authentication (clicked X, closed modal)
   - Handling: Allow retry or cancel transaction

7. **`THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT`**
   - Type: `UNKNOWN`
   - Cause: Cardinal API took too long
   - Fix: Retry, check network conditions

## Testing

### Unit Tests

Location: `test/three-d-secure/unit/`

**Test Categories:**

- External API tests (`external/three-d-secure.js`)
- Framework tests (`external/frameworks/*.js`)
- Internal frame tests (`internal/*.js`)

### Integration Tests

Test actual authentication flows:

- Frictionless authentication
- Challenge presentation and completion
- Error scenarios
- Different framework types

### Test Cards

Use Braintree's test card numbers for different scenarios:

- Challenge required: Specific test cards trigger challenges
- Frictionless: Most test cards process without challenge
- Errors: Invalid cards trigger various error states

See [Braintree Testing Guide](https://developer.paypal.com/braintree/docs/guides/3d-secure/testing-go-live) for test card details.

## Debugging

### Common Issues

**1. Cardinal SDK Won't Load**

**Symptoms:**

- `THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED`
- `THREEDS_CARDINAL_SDK_SETUP_FAILED`

**Debug Steps:**

1. Check browser console for network errors
2. Verify CSP policy allows Cardinal CDN (`songbird.cardinalcommerce.com`)
3. Test Cardinal URL directly in browser
4. Check for ad blockers or security software

**2. Modal Doesn't Appear**

**Symptoms:**

- `lookup-complete` fires with `requiresUserAuthentication: true`
- No modal visible

**Debug:**

1. Check z-index conflicts (modal uses z-index: 999999)
2. Verify `next()` was called in `lookup-complete` listener
3. Check browser console for errors
4. Test with inline-iframe version to isolate issue

**3. Liability Not Shifting**

**Symptoms:**

- `liabilityShifted: false` in response
- `liabilityShiftPossible: false`

**Causes:**

- Card not enrolled in 3DS
- Card issuer doesn't support 3DS v2
- Invalid or incomplete customer data

**Solutions:**

- Verify card supports 3DS (test with known 3DS cards)
- Provide complete billing/customer information
- Check gateway configuration with Braintree support

**4. Authentication Iframe Issues (Inline)**

**Symptoms:**

- Iframe doesn't display challenge
- Iframe appears empty

**Debug:**

1. Ensure `next()` called in `authentication-iframe-available`
2. Check iframe src URL is loading
3. Verify container styling (height, width, positioning)
4. Check for CSP issues blocking iframe content

### Verbose Logging

Enable Cardinal SDK logging:

```javascript
cardinalSDKConfig: {
  logging: {
    level: "verbose"; // See Cardinal API calls and responses
  }
}
```

Enable Braintree development logging:

```bash
BRAINTREE_JS_ENV=development
```

## Implementation Examples

### Basic Implementation

```javascript
// 1. Create 3DS instance
braintree.threeDSecure.create(
  {
    client: clientInstance,
    version: "2",
  },
  function (err, threeDSecureInstance) {
    if (err) {
      console.error(err);
      return;
    }

    // 2. Set up lookup listener
    threeDSecureInstance.on("lookup-complete", function (data, next) {
      console.log("Requires challenge:", data.requiresUserAuthentication);
      next(); // Proceed with authentication
    });

    // 3. When user submits payment
    submitButton.addEventListener("click", function () {
      // Tokenize card first
      hostedFieldsInstance.tokenize(function (tokenizeErr, tokenizePayload) {
        if (tokenizeErr) {
          console.error(tokenizeErr);
          return;
        }

        // 4. Verify with 3DS
        threeDSecureInstance.verifyCard(
          {
            nonce: tokenizePayload.nonce,
            bin: tokenizePayload.details.bin,
            amount: "100.00",
          },
          function (verifyErr, verifyPayload) {
            if (verifyErr) {
              console.error(verifyErr);
              return;
            }

            // 5. Send new nonce to server
            sendToServer(verifyPayload.nonce);
          }
        );
      });
    });
  }
);
```

### With Customer Information

```javascript
threeDSecureInstance.verifyCard(
  {
    nonce: nonce,
    bin: bin,
    amount: "250.00",
    email: "customer@example.com",
    mobilePhoneNumber: "5551234567",
    billingAddress: {
      givenName: "John",
      surname: "Doe",
      streetAddress: "123 Main Street",
      extendedAddress: "Apt 4B",
      locality: "Chicago",
      region: "IL",
      postalCode: "60606",
      countryCodeAlpha2: "US",
      phoneNumber: "5551234567",
    },
    additionalInformation: {
      shippingGivenName: "Jane",
      shippingSurname: "Doe",
      shippingAddress: {
        streetAddress: "456 Oak Ave",
        locality: "New York",
        region: "NY",
        postalCode: "10001",
        countryCodeAlpha2: "US",
      },
    },
  },
  callback
);
```

### Cancelling Verification

```javascript
var verificationPromise;

// Start verification
verificationPromise = threeDSecureInstance.verifyCard({
  nonce: nonce,
  bin: bin,
  amount: "100.00",
});

// User clicks cancel button
cancelButton.addEventListener("click", function () {
  threeDSecureInstance.cancelVerifyCard(function (err, payload) {
    // Verification cancelled
    // payload.nonce: partially authenticated nonce (still usable but without liability shift)
  });
});
```
