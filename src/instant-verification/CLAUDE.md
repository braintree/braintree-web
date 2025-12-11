# Instant Verification Component - CLAUDE.md

This file provides component-specific guidance for working with the Instant Verification component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Instant Verification component enables **OpenBanking-based instant bank verification** for bank account payments. This component uses a redirect flow where customers authorize their bank account directly through their bank's interface, providing instant verification without micro-deposits.

**Also Known As:** OpenBanking (in gateway configuration)

**Key Features:**

- Instant bank account verification (no micro-deposit wait time)
- Redirect-based authorization flow to customer's bank
- Returns tokenized bank account nonce
- Support for multiple regions/banks
- Secure JWT-based session management

**Docs:** [Braintree Bank Payments Guide](https://developer.paypal.com/braintree/docs/guides/payment-methods/bank-accounts)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `instant-verification.js` - Main InstantVerification class (2 public methods)
- `errors.js` - Instant Verification error codes (5 errors)
- `constants.js` - Experience URL constants for different environments

**Note:** This is a simple component (4 files) that handles redirect-based bank authorization flows.

## How It Works

### Instant Verification Flow

```
1. Create Instant Verification Instance
   ↓
2. Customer Clicks "Pay with Bank"
   ↓
3. Generate JWT on Server
   (contains redirect/callback URLs)
   ↓
4. Call startPayment(jwt)
   ↓
5. Customer Redirected to Bank
   (PayPal OpenFinance experience)
   ↓
6. Customer Authorizes at Bank
   ↓
7. Redirect Back to Merchant
   (with success/cancel/error param)
   ↓
8. Call handleRedirect()
   ↓
9. Receive Bank Account Nonce
   ↓
10. Send Nonce to Server for Transaction
```

### Prerequisites

**1. Braintree Setup:**

- OpenBanking/Instant Verification enabled in Braintree control panel
- Merchant account configured for bank payments
- Server-side JWT generation capability

**2. Server Requirements:**

- Generate JWT containing redirect and callback URLs
- Handle nonce on callback after successful authorization
- Create transaction using bank account nonce

**3. Redirect URLs:**

- Success callback URL (where customer returns after authorization)
- Cancel callback URL (where customer returns if they cancel)
- Error callback URL (where customer returns on error)

## Basic Usage

### Complete Implementation

```javascript
var instantVerification = require("braintree-web/instant-verification");

// 1. Create client
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (clientErr, clientInstance) {
    if (clientErr) {
      console.error("Error creating client:", clientErr);
      return;
    }

    // 2. Create Instant Verification instance
    instantVerification.create(
      {
        client: clientInstance,
      },
      function (createErr, instantVerificationInstance) {
        if (createErr) {
          console.error("Error creating Instant Verification:", createErr);
          return;
        }

        // 3. Handle pay button click
        document
          .getElementById("pay-with-bank-btn")
          .addEventListener("click", function () {
            // Get JWT from your server
            fetchJWTFromServer().then(function (jwt) {
              // Start payment flow (redirects customer to bank)
              instantVerificationInstance
                .startPayment({
                  jwt: jwt,
                })
                .catch(function (err) {
                  console.error("Error starting payment:", err);
                });
            });
          });
      }
    );
  }
);

// 4. On callback page (after customer returns from bank)
instantVerification.create(
  {
    client: clientInstance,
  },
  function (createErr, instantVerificationInstance) {
    if (createErr) {
      console.error(createErr);
      return;
    }

    // Parse URL parameters
    var urlParams = new URLSearchParams(window.location.search);

    // Handle redirect
    instantVerificationInstance
      .handleRedirect({
        success: urlParams.get("success"),
        cancel: urlParams.get("cancel"),
        error: urlParams.get("error"),
      })
      .then(function (nonce) {
        if (nonce) {
          // Send nonce to server to create transaction
          submitPaymentToServer(nonce);
        } else {
          console.log("No nonce returned");
        }
      })
      .catch(function (err) {
        if (err.code === "INSTANT_VERIFICATION_CANCELED") {
          console.log("Customer canceled payment");
        } else {
          console.error("Payment failed:", err);
        }
      });
  }
);
```

## Configuration Options

### Creation Options

```javascript
instantVerification.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  useDeferredClient: true, // Optional: Immediate instance availability
});
```

**Parameters:**

- `client` (Client, optional): A Braintree Client instance
- `authorization` (string, optional): A tokenizationKey or clientToken (alternative to client)
- `useDeferredClient` (boolean, optional): Create instance before client is ready

**Returns:**

- `Promise<InstantVerification>` - Resolves with InstantVerification instance

## Methods

### startPayment()

Initiates the Instant Verification payment flow by redirecting the customer to their bank's authorization page.

**Important:** This method performs a full page redirect. Save any necessary state before calling.

**Signature:**

```javascript
instantVerificationInstance.startPayment(options);
// OR
instantVerificationInstance.startPayment(options).then(function () {
  // This code will NOT execute because redirect happens immediately
});
```

**Parameters:**

- `options.jwt` (string, required): A JSON Web Token from your server containing redirect and callback URLs

**Returns:**

- `Promise<void>` - Resolves before redirect (for error handling), but redirect happens immediately

**Redirect Behavior:**

- Sets `window.location.href` to PayPal OpenFinance experience URL
- Customer leaves your site
- No return from this method in normal flow

**JWT Requirements:**

The JWT must be generated on your server and contain:

- Redirect URL (where to send customer for authorization)
- Callback URL (where to return customer after authorization)
- Merchant identifier
- Session information

**Example:**

```javascript
// Get JWT from server
fetch("/api/instant-verification/create-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: "100.00",
    returnUrl: "https://yoursite.com/instant-verification/callback",
  }),
})
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    var jwt = data.jwt;

    // Start payment flow
    instantVerificationInstance
      .startPayment({
        jwt: jwt,
      })
      .catch(function (err) {
        console.error("Error starting payment:", err);
        // Handle error (redirect won't happen if JWT is invalid)
      });
  });
```

### handleRedirect()

Handles the redirect back from the Instant Verification experience and extracts the payment result.

**Signature:**

```javascript
instantVerificationInstance.handleRedirect(options, callback);
// OR
instantVerificationInstance.handleRedirect(options).then(function (nonce) {
  // Use nonce
});
```

**Parameters:**

- `options.success` (string, optional): URL query parameter returned on successful authorization
- `options.cancel` (string, optional): URL query parameter returned when customer cancels
- `options.error` (string, optional): URL query parameter returned on error

**Returns:**

- `Promise<string|null>` - Resolves with bank account nonce on success, or null if no tokenization occurred
- `Promise<Error>` - Rejects with BraintreeError if canceled or failed

**Response States:**

**1. Success (options.success exists):**

```javascript
// Returns bank account nonce
{
  nonce: "tokencc_abc_123_xyz";
}
```

**2. Cancel (options.cancel exists):**

```javascript
// Throws INSTANT_VERIFICATION_CANCELED error
```

**3. Error (options.error exists):**

```javascript
// Throws INSTANT_VERIFICATION_FAILURE error
```

**Example:**

```javascript
// On callback page
window.addEventListener("DOMContentLoaded", function () {
  instantVerification
    .create({
      client: clientInstance,
    })
    .then(function (instantVerificationInstance) {
      // Parse URL query parameters
      var urlParams = new URLSearchParams(window.location.search);

      // Handle the redirect
      return instantVerificationInstance.handleRedirect({
        success: urlParams.get("success"),
        cancel: urlParams.get("cancel"),
        error: urlParams.get("error"),
      });
    })
    .then(function (nonce) {
      if (nonce) {
        console.log("Bank account authorized! Nonce:", nonce);

        // Send nonce to server
        return fetch("/api/create-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce: nonce }),
        });
      } else {
        console.log("No nonce available");
      }
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      console.log("Transaction created:", result.transaction.id);
      window.location.href = "/success";
    })
    .catch(function (err) {
      if (err.code === "INSTANT_VERIFICATION_CANCELED") {
        console.log("Customer canceled the authorization");
        window.location.href = "/checkout?canceled=true";
      } else if (err.code === "INSTANT_VERIFICATION_FAILURE") {
        console.error("Authorization failed:", err);
        window.location.href = "/checkout?error=true";
      } else {
        console.error("Error:", err);
      }
    });
});
```

## Error Handling

### Error Codes

From `errors.js`:

**Creation Errors:**

**1. `INSTANT_VERIFICATION_NOT_ENABLED` (MERCHANT)**

- **Cause:** Instant Verification (OpenBanking) not enabled in Braintree control panel
- **Fix:** Enable OpenBanking in Braintree Control Panel → Settings
- **Fix:** Verify merchant account supports bank payments

**startPayment Errors:**

**2. `INSTANT_VERIFICATION_JWT_MISSING` (MERCHANT)**

- **Cause:** Missing `jwt` parameter in `startPayment()` call
- **Fix:** Always provide a JWT from your server

**Example:**

```javascript
// BAD
instantVerificationInstance.startPayment({});

// GOOD
instantVerificationInstance.startPayment({
  jwt: jwtFromServer,
});
```

**handleRedirect Errors:**

**3. `INSTANT_VERIFICATION_CANCELED` (CUSTOMER)**

- **Cause:** Customer canceled authorization at bank
- **Type:** Expected user behavior, not an error
- **Handling:** Show message, allow retry

**Example:**

```javascript
handleRedirect(options).catch(function (err) {
  if (err.code === "INSTANT_VERIFICATION_CANCELED") {
    showMessage("You canceled the bank authorization. Please try again.");
    // Redirect back to checkout
  }
});
```

**4. `INSTANT_VERIFICATION_FAILURE` (UNKNOWN)**

- **Cause:** Authorization failed during bank interaction
- **Common reasons:**
  - Bank declined authorization
  - Network error during authorization
  - Invalid bank credentials
  - Technical issue at bank
- **Handling:** Show error, allow retry or alternative payment method

**Example:**

```javascript
handleRedirect(options).catch(function (err) {
  if (err.code === "INSTANT_VERIFICATION_FAILURE") {
    showMessage(
      "Bank authorization failed. Please try again or use a different payment method."
    );
  }
});
```

**General Errors:**

**5. `INSTANT_VERIFICATION_ERROR` (MERCHANT)**

- **Cause:** General error in Instant Verification flow
- **Debugging:** Check error details, verify setup

## Testing

### Test Structure

Location: `test/instant-verification/unit/`

**Test Categories:**

- Component creation
- `startPayment()` method
- `handleRedirect()` method
- URL building and query string generation
- Error scenarios

## Debugging

### Common Issues

**1. "Instant Verification not enabled"**

**Symptoms:**

- `INSTANT_VERIFICATION_NOT_ENABLED` error on create()

**Debug:**

1. Check Braintree Control Panel → Settings → Processing
2. Verify OpenBanking is enabled
3. Check merchant account configuration
4. Verify gateway configuration returns `openBanking` property

**Fix:**

```javascript
// Check if enabled before creating
var config = clientInstance.getConfiguration();
if (config.gatewayConfiguration.openBanking) {
  // Safe to create
  instantVerification.create({ client: clientInstance });
} else {
  console.log("Instant Verification not available for this merchant");
}
```

**2. "JWT missing" error**

**Symptoms:**

- `INSTANT_VERIFICATION_JWT_MISSING` error
- startPayment() fails immediately

**Debug:**

1. Verify JWT is being fetched from server
2. Check JWT is being passed to startPayment()
3. Ensure JWT is not undefined or null

**Fix:**

```javascript
// Always validate JWT before calling
function startPaymentFlow() {
  fetchJWT().then(function (jwt) {
    if (!jwt) {
      console.error("Failed to get JWT from server");
      return;
    }

    instantVerificationInstance.startPayment({ jwt: jwt });
  });
}
```

**3. "Redirect not happening"**

**Symptoms:**

- startPayment() called but no redirect occurs
- Page stays on same URL

**Debug:**

1. Check browser console for JavaScript errors
2. Verify `window.location` is available
3. Check if running in non-browser environment (tests, SSR)
4. Verify JWT is valid

**4. "Can't parse redirect parameters"**

**Symptoms:**

- handleRedirect() fails to parse success/cancel/error params
- URL parameters not being read correctly

**Debug:**

1. Check URL after redirect: `?success=...` or `?cancel=...` or `?error=...`
2. Verify URLSearchParams is available (or use polyfill)
3. Check parameter is base64-encoded JSON

**Fix:**

```javascript
// Robust parameter parsing
var urlParams = new URLSearchParams(window.location.search);
var successParam = urlParams.get("success");
var cancelParam = urlParams.get("cancel");
var errorParam = urlParams.get("error");

console.log("Success param:", successParam);
console.log("Cancel param:", cancelParam);
console.log("Error param:", errorParam);

instantVerificationInstance.handleRedirect({
  success: successParam,
  cancel: cancelParam,
  error: errorParam,
});
```

**5. "Empty nonce returned"**

**Symptoms:**

- handleRedirect() resolves but nonce is null/undefined
- Success parameter exists but no tokenization occurred

**Debug:**

1. Decode success parameter (base64) and inspect payload
2. Check if `payload.tokenizedAccounts` array exists and has items
3. Verify bank authorization completed successfully

**Fix:**

```javascript
handleRedirect(options).then(function (nonce) {
  if (!nonce) {
    console.warn("Authorization completed but no account was tokenized");
    // Handle gracefully - maybe show message to retry
    showMessage("Unable to verify bank account. Please try again.");
  } else {
    // Process payment with nonce
    processPayment(nonce);
  }
});
```

## Implementation Examples

### Complete Checkout Flow

```javascript
// Page 1: Checkout page
var instantVerification = require("braintree-web/instant-verification");

// Create instance
braintree.client
  .create({
    authorization: CLIENT_AUTHORIZATION,
  })
  .then(function (clientInstance) {
    return instantVerification.create({
      client: clientInstance,
    });
  })
  .then(function (instantVerificationInstance) {
    // Store instance for later use
    window.ivInstance = instantVerificationInstance;

    // Show bank payment button
    document.getElementById("pay-with-bank-btn").style.display = "block";

    // Handle click
    document
      .getElementById("pay-with-bank-btn")
      .addEventListener("click", function () {
        // Disable button to prevent double-click
        this.disabled = true;
        this.textContent = "Redirecting...";

        // Get JWT from server
        fetch("/api/instant-verification/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: getCartTotal(),
            currency: "USD",
            returnUrl:
              window.location.origin + "/instant-verification/callback",
          }),
        })
          .then(function (response) {
            if (!response.ok) {
              throw new Error("Failed to create session");
            }
            return response.json();
          })
          .then(function (data) {
            // Start payment flow (will redirect)
            return window.ivInstance.startPayment({
              jwt: data.jwt,
            });
          })
          .catch(function (err) {
            console.error("Error:", err);
            // Re-enable button
            document.getElementById("pay-with-bank-btn").disabled = false;
            document.getElementById("pay-with-bank-btn").textContent =
              "Pay with Bank";
            showError("Unable to start bank payment. Please try again.");
          });
      });
  })
  .catch(function (err) {
    console.error("Setup error:", err);
    if (err.code === "INSTANT_VERIFICATION_NOT_ENABLED") {
      // Hide bank payment option
      document.getElementById("pay-with-bank-btn").style.display = "none";
    }
  });
```

```javascript
// Page 2: Callback page (/instant-verification/callback)
var instantVerification = require("braintree-web/instant-verification");

window.addEventListener("DOMContentLoaded", function () {
  // Show loading state
  showLoading("Processing your bank authorization...");

  // Create client and instance
  braintree.client
    .create({
      authorization: CLIENT_AUTHORIZATION,
    })
    .then(function (clientInstance) {
      return instantVerification.create({
        client: clientInstance,
      });
    })
    .then(function (instantVerificationInstance) {
      // Get URL parameters
      var urlParams = new URLSearchParams(window.location.search);

      // Handle redirect
      return instantVerificationInstance.handleRedirect({
        success: urlParams.get("success"),
        cancel: urlParams.get("cancel"),
        error: urlParams.get("error"),
      });
    })
    .then(function (nonce) {
      if (!nonce) {
        throw new Error("No nonce received");
      }

      // Send nonce to server to create transaction
      return fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: nonce,
          amount: getStoredCartTotal(),
        }),
      });
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      if (result.success) {
        // Redirect to success page
        window.location.href = "/order/confirmation?id=" + result.transactionId;
      } else {
        throw new Error(result.message || "Transaction failed");
      }
    })
    .catch(function (err) {
      hideLoading();

      if (err.code === "INSTANT_VERIFICATION_CANCELED") {
        // Customer canceled - redirect back to checkout
        showMessage("You canceled the bank authorization.");
        setTimeout(function () {
          window.location.href = "/checkout";
        }, 2000);
      } else if (err.code === "INSTANT_VERIFICATION_FAILURE") {
        // Authorization failed
        showError(
          "Bank authorization failed. Please try again or use a different payment method."
        );
        setTimeout(function () {
          window.location.href = "/checkout?error=bank_auth_failed";
        }, 3000);
      } else {
        // Other error
        console.error("Error:", err);
        showError("An error occurred. Please try again.");
        setTimeout(function () {
          window.location.href = "/checkout";
        }, 3000);
      }
    });
});
```

### With Alternative Payment Methods

```javascript
// Offer multiple payment options including Instant Verification
function setupPaymentMethods(clientInstance) {
  var promises = [];

  // Setup Hosted Fields for cards
  promises.push(
    braintree.hostedFields.create({
      client: clientInstance,
      fields: {
        /* ... */
      },
    })
  );

  // Setup Instant Verification for bank accounts
  promises.push(
    braintree.instantVerification
      .create({
        client: clientInstance,
      })
      .catch(function (err) {
        if (err.code === "INSTANT_VERIFICATION_NOT_ENABLED") {
          // Not available, return null
          return null;
        }
        throw err;
      })
  );

  return Promise.all(promises).then(function (instances) {
    var hostedFieldsInstance = instances[0];
    var instantVerificationInstance = instances[1];

    // Setup card payment button
    document
      .getElementById("pay-with-card-btn")
      .addEventListener("click", function () {
        hostedFieldsInstance.tokenize().then(function (payload) {
          submitPayment(payload.nonce);
        });
      });

    // Setup bank payment button (if available)
    if (instantVerificationInstance) {
      document.getElementById("pay-with-bank-btn").style.display = "block";
      document
        .getElementById("pay-with-bank-btn")
        .addEventListener("click", function () {
          fetchJWT().then(function (jwt) {
            instantVerificationInstance.startPayment({ jwt: jwt });
          });
        });
    }
  });
}
```

## Important Notes

### Redirect Flow

**Critical:** This component uses a full-page redirect flow:

1. Customer leaves your site to authorize at their bank
2. Customer returns to your callback URL with query parameters
3. You must handle the callback on a separate page/route

**State Management:**

- Save any necessary state before calling `startPayment()`
- Use server-side session storage for cart/order data
- Don't rely on client-side state after redirect

### JWT Security

**Server-Side Only:**

- JWT must be generated on your server (never client-side)
- JWT contains sensitive session information
- JWT should be single-use and time-limited
- Never expose JWT generation logic to client

### Browser Requirements

- Modern browsers (IE11+, Edge, Chrome, Firefox, Safari)
- JavaScript must be enabled
- Cookies must be enabled (for session management)
- URL parameters must be preserved across redirects

### Regional Availability

- Availability depends on merchant account configuration
- Supported banks vary by region
- Check with Braintree for specific regional support
