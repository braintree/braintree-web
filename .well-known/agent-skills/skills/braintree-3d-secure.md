---
name: braintree-3d-secure
description: 3D Secure v2 authentication with Cardinal Commerce Songbird - verifyCard flow, challenge handling, SCA exemptions
---

# 3D Secure v2 Integration

## Prerequisites

- **HTTPS required** (production)
- **Client token required** (not tokenization key)
- **3D Secure enabled** in Braintree control panel
- Only **version 2** supported (v1 removed)

## Setup

```javascript
braintree.threeDSecure.create(
  {
    client: clientInstance,
    version: "2", // Required: '2', '2-bootstrap3-modal', or '2-inline-iframe'
    cardinalSDKConfig: {
      // Optional
      logging: { level: "verbose" }, // 'on', 'verbose', 'off'
      timeout: 10000, // Cardinal API timeout (ms)
      maxRequestRetries: 3,
    },
  },
  function (err, threeDSecureInstance) {
    // Ready
  }
);
```

## Authentication Flow

```
Tokenize card (Hosted Fields) -> verifyCard() -> lookup-complete event -> challenge (if needed) -> new nonce
```

**Important:** The nonce returned by `verifyCard` is NEW. The original nonce is consumed during lookup.

### Step 1: Register Lookup Handler

```javascript
threeDSecureInstance.on("lookup-complete", function (data, next) {
  // data.requiresUserAuthentication -- true if challenge needed
  // data.threeDSecureInfo.liabilityShifted -- true if already shifted
  // data.threeDSecureInfo.liabilityShiftPossible -- true if shift achievable

  // MUST call next() to proceed (shows challenge modal if needed)
  next();
});
```

### Step 2: Verify Card

```javascript
threeDSecureInstance.verifyCard(
  {
    nonce: payload.nonce, // From hostedFields.tokenize()
    bin: payload.details.bin, // Required: card BIN
    amount: "100.00", // Required: transaction amount

    // Optional but recommended for better approval rates:
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
  },
  function (err, verifyPayload) {
    if (err) {
      console.error(err);
      return;
    }

    // verifyPayload.nonce -- NEW nonce to send to server
    // verifyPayload.threeDSecureInfo.liabilityShifted -- boolean
    // verifyPayload.threeDSecureInfo.liabilityShiftPossible -- boolean
    submitToServer(verifyPayload.nonce);
  }
);
```

## Outcome Scenarios

| Scenario             | requiresUserAuthentication | liabilityShifted | liabilityShiftPossible | Action                                  |
| -------------------- | -------------------------- | ---------------- | ---------------------- | --------------------------------------- |
| Frictionless success | false                      | true             | true                   | Use nonce, liability shifted            |
| Challenge required   | true                       | false            | true                   | Call `next()`, user completes challenge |
| Not enrolled         | false                      | false            | false                  | Use nonce, seller assumes liability     |
| Auth failed          | -                          | false            | true                   | Decide whether to proceed without shift |

## Framework Options

| Version String         | UI                     | Requirements                                   |
| ---------------------- | ---------------------- | ---------------------------------------------- |
| `'2'`                  | Cardinal managed modal | None (default)                                 |
| `'2-bootstrap3-modal'` | Bootstrap 3 modal      | Bootstrap 3 CSS/JS + jQuery loaded             |
| `'2-inline-iframe'`    | Merchant-placed iframe | Handle `authentication-iframe-available` event |

### Inline Iframe

```javascript
threeDSecureInstance.on(
  "authentication-iframe-available",
  function (event, next) {
    document.getElementById("3ds-container").appendChild(event.element);
    next(); // Signal iframe is on page
  }
);

threeDSecureInstance.on("authentication-iframe-unavailable", function () {
  // Remove iframe from page
});
```

## SCA Exemptions

```javascript
threeDSecureInstance.verifyCard(
  {
    nonce: nonce,
    bin: bin,
    amount: "10.00",
    requestedExemptionType: "low_value", // or 'transaction_risk_analysis'
  },
  callback
);
```

Exemptions are requests -- the card issuer makes the final decision.

## Cancellation

```javascript
threeDSecureInstance.cancelVerifyCard(function (err, payload) {
  // payload.nonce: partially authenticated nonce (no liability shift)
});
```

## Common Errors

| Code                                            | Type     | Fix                                              |
| ----------------------------------------------- | -------- | ------------------------------------------------ |
| `THREEDS_NOT_ENABLED`                           | MERCHANT | Enable 3D Secure in Braintree control panel      |
| `THREEDS_CAN_NOT_USE_TOKENIZATION_KEY`          | MERCHANT | Use client token instead                         |
| `THREEDS_HTTPS_REQUIRED`                        | MERCHANT | Serve page over HTTPS                            |
| `THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED`       | NETWORK  | Check CSP allows `songbird.cardinalcommerce.com` |
| `THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT`           | UNKNOWN  | Check network, retry                             |
| `THREEDS_AUTHENTICATION_IN_PROGRESS`            | MERCHANT | Wait for current verifyCard to complete          |
| `THREEDS_MISSING_VERIFY_CARD_OPTION`            | MERCHANT | Provide nonce, bin, and amount                   |
| `THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR` | MERCHANT | Use fresh nonce (original may be consumed)       |
| `THREEDS_CARDINAL_SDK_CANCELED`                 | CUSTOMER | User closed challenge modal, allow retry         |

## CSP Requirements

Allow in Content-Security-Policy:

- `script-src`: `https://songbird.cardinalcommerce.com`
- `frame-src`: `https://songbird.cardinalcommerce.com`, `https://*.cardinalcommerce.com`
- `connect-src`: `https://*.cardinalcommerce.com`
