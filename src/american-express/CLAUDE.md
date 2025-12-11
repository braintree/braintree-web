# American Express Component - CLAUDE.md

This file provides component-specific guidance for working with the American Express component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The American Express component provides integration with **American Express Express Checkout** and allows merchants to retrieve Amex-specific data for cardholders. This component is used specifically for Amex Express Checkout flows and rewards balance queries.

**Important:** To accept American Express cards for regular payment processing, use the Hosted Fields component instead.

**Key Features:**

- Retrieve American Express rewards balances for existing nonces
- Get Express Checkout profile data from Amex nonces
- Simple API with two main methods
- No complex UI or iframe handling

**Docs:** [Braintree American Express Guide](https://developer.paypal.com/braintree/docs/guides/american-express)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `american-express.js` - Main AmericanExpress class implementation (3 public methods)
- `errors.js` - American Express error codes (2 errors)

**Note:** This is a simple component (3 files) that acts as a data retrieval API for Amex-specific information.

## How It Works

### American Express Integration Flow

```
1. Create American Express Instance
   ↓
2. Obtain Nonce
   (from Hosted Fields or Amex directly)
   ↓
3. Call Method
   - getRewardsBalance() OR
   - getExpressCheckoutProfile()
   ↓
4. Receive Amex Data
   ↓
5. Display to Customer or Process
```

### Prerequisites

**1. Braintree Setup:**

- Merchant account enabled for American Express
- American Express Express Checkout enabled (for getExpressCheckoutProfile)

**2. Nonce Requirements:**

- For `getRewardsBalance()`: Braintree nonce from a tokenized Amex card
- For `getExpressCheckoutProfile()`: Nonce from American Express (not Braintree)

## Basic Usage

### Complete Implementation

```javascript
var americanExpress = require("braintree-web/american-express");

// Create client first
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (clientErr, clientInstance) {
    if (clientErr) {
      console.error("Error creating client:", clientErr);
      return;
    }

    // Create American Express instance
    americanExpress.create(
      {
        client: clientInstance,
      },
      function (createErr, americanExpressInstance) {
        if (createErr) {
          console.error("Error creating American Express:", createErr);
          return;
        }

        // Instance is ready to use
        // Call getRewardsBalance or getExpressCheckoutProfile
      }
    );
  }
);
```

## Configuration Options

### Creation Options

```javascript
americanExpress.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
});
```

**Parameters:**

- `client` (Client, optional): A Braintree Client instance
- `authorization` (string, optional): A tokenizationKey or clientToken (alternative to client)

**Returns:**

- `Promise<AmericanExpress>` - Resolves with AmericanExpress instance

## Methods

### getRewardsBalance()

Retrieves the rewards balance associated with a Braintree nonce for an American Express card.

**Signature:**

```javascript
americanExpressInstance.getRewardsBalance(options, callback);
// OR
americanExpressInstance.getRewardsBalance(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.nonce` (string, required): An existing Braintree nonce from a tokenized Amex card

**Returns:**

- `Promise<rewardsPayload>` - Resolves with rewards balance data

**Payload Structure:**

```javascript
{
  rewardsAmount: '1234.56',     // Rewards balance as string
  rewardsUnit: 'Points',        // Unit of rewards (Points, Miles, etc.)
  currencyAmount: '12.34',      // Currency equivalent (if available)
  currencyIsoCode: 'USD',       // Currency code
  conversationId: 'abc123',     // Amex conversation ID
  requestId: 'xyz789',          // Amex request ID
  error: null                   // Error object if Amex returns error
}
```

**Error Payload (when payload.error exists):**

```javascript
{
  error: {
    code: 'ERROR_CODE',
    message: 'Error description'
  },
  conversationId: 'abc123',
  requestId: 'xyz789'
}
```

**Example:**

```javascript
// After getting a nonce from Hosted Fields
hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
  if (tokenizeErr) {
    console.error(tokenizeErr);
    return;
  }

  // Check if it's an Amex card
  if (payload.details.cardType === "American Express") {
    americanExpressInstance.getRewardsBalance(
      {
        nonce: payload.nonce,
      },
      function (getErr, rewardsPayload) {
        if (getErr) {
          console.error("Error getting rewards:", getErr);
          return;
        }

        if (rewardsPayload.error) {
          console.error("Amex error:", rewardsPayload.error.message);
          return;
        }

        // Display rewards to customer
        console.log(
          "You have " +
            rewardsPayload.rewardsAmount +
            " " +
            rewardsPayload.rewardsUnit
        );
      }
    );
  }
});
```

### getExpressCheckoutProfile()

Retrieves the Express Checkout profile for a nonce from American Express. This nonce comes from Amex directly (not from Braintree tokenization).

**Signature:**

```javascript
americanExpressInstance.getExpressCheckoutProfile(options, callback);
// OR
americanExpressInstance
  .getExpressCheckoutProfile(options)
  .then(function (payload) {
    // Use payload
  });
```

**Parameters:**

- `options.nonce` (string, required): A nonce from American Express (NOT a Braintree nonce)

**Returns:**

- `Promise<profilePayload>` - Resolves with Express Checkout profile data

**Payload Structure:**

```javascript
{
  amexExpressCheckoutCards: [
    {
      nonce: "tokencc_abc_123", // Braintree nonce for this card
      cardType: "American Express",
      lastTwo: "05", // Last 2 digits
      expirationMonth: "12",
      expirationYear: "2025",
      bin: "378282", // Bank Identification Number
      subscriberId: "sub_123", // Amex subscriber ID
    },
    // ... more cards if available
  ];
}
```

**Example:**

```javascript
// After receiving Amex nonce from Amex Express Checkout flow
var amexNonce = getAmexNonceFromExpressCheckout();

americanExpressInstance.getExpressCheckoutProfile(
  {
    nonce: amexNonce,
  },
  function (getErr, profilePayload) {
    if (getErr) {
      console.error("Error getting profile:", getErr);
      return;
    }

    // Display available cards to customer
    profilePayload.amexExpressCheckoutCards.forEach(function (card) {
      console.log("Card ending in: " + card.lastTwo);
      // Use card.nonce for payment
    });
  }
);
```

### teardown()

Cleanly tears down the American Express instance and invalidates all methods.

**Signature:**

```javascript
americanExpressInstance.teardown(callback);
// OR
americanExpressInstance.teardown().then(function () {
  // Teardown complete
});
```

**Parameters:**

- None

**Returns:**

- `Promise<void>` - Resolves when teardown is complete

**Example:**

```javascript
americanExpressInstance
  .teardown()
  .then(function () {
    console.log("American Express instance cleaned up");
    // Instance methods will now throw errors if called
  })
  .catch(function (teardownErr) {
    console.error("Error during teardown:", teardownErr);
  });
```

## Error Handling

### Error Codes

From `errors.js`:

**1. `AMEX_NONCE_REQUIRED` (MERCHANT)**

- **Cause:** Missing `nonce` parameter in method call
- **Methods affected:** `getRewardsBalance()`, `getExpressCheckoutProfile()`
- **Fix:** Always provide a `nonce` parameter

**Example:**

```javascript
// BAD
americanExpressInstance.getRewardsBalance({});

// GOOD
americanExpressInstance.getRewardsBalance({
  nonce: "tokencc_abc_123",
});
```

**2. `AMEX_NETWORK_ERROR` (NETWORK)**

- **Cause:** Network error when communicating with Braintree gateway
- **Methods affected:** `getRewardsBalance()`, `getExpressCheckoutProfile()`
- **Fix:** Check internet connectivity, retry request, verify authorization is valid

**Debug Steps:**

1. Check browser console for network errors
2. Verify Braintree gateway is accessible
3. Check authorization hasn't expired
4. Retry the operation
5. Check `err.details.originalError` for underlying cause

**Example:**

```javascript
americanExpressInstance
  .getRewardsBalance({
    nonce: nonce,
  })
  .catch(function (err) {
    if (err.code === "AMEX_NETWORK_ERROR") {
      console.error("Network error:", err.message);
      console.error("Original error:", err.details.originalError);
      // Retry or show error to user
    }
  });
```

## Testing

### Test Structure

Location: `test/american-express/unit/`

**Test Categories:**

- Component creation
- `getRewardsBalance()` method
- `getExpressCheckoutProfile()` method
- Error scenarios
- Teardown

## Debugging

### Common Issues

**1. "Nonce required" error**

**Symptoms:**

- `AMEX_NONCE_REQUIRED` error

**Debug:**

1. Verify nonce is being passed in options object
2. Check that nonce is not undefined or null
3. Ensure nonce is a string

**Fix:**

```javascript
// Verify nonce before calling
if (nonce) {
  americanExpressInstance.getRewardsBalance({ nonce: nonce });
}
```

**2. "Wrong type of nonce" issue**

**Symptoms:**

- API returns error for wrong nonce type
- `getExpressCheckoutProfile()` fails with Braintree nonce
- `getRewardsBalance()` fails with Amex nonce

**Debug:**

1. **getRewardsBalance()** requires: Braintree nonce (from Hosted Fields, Drop-in, etc.)
2. **getExpressCheckoutProfile()** requires: Amex nonce (from Amex Express Checkout flow)

**Fix:**

```javascript
// For rewards balance - use Braintree nonce
hostedFieldsInstance.tokenize(function (err, payload) {
  americanExpressInstance.getRewardsBalance({
    nonce: payload.nonce, // Braintree nonce
  });
});

// For express checkout - use Amex nonce
var amexNonce = getFromAmexExpressCheckout();
americanExpressInstance.getExpressCheckoutProfile({
  nonce: amexNonce, // Amex nonce
});
```

**3. "Network error"**

**Symptoms:**

- `AMEX_NETWORK_ERROR` error
- Request fails or times out

**Debug:**

1. Check browser network tab for failed requests
2. Verify endpoint: `payment_methods/amex_rewards_balance` or `payment_methods/amex_express_checkout_cards/`
3. Check authorization is valid
4. Verify merchant account has Amex enabled

**4. "Error in payload.error"**

**Symptoms:**

- `getRewardsBalance()` succeeds but `payload.error` exists
- Amex-specific error message

**Debug:**

1. Check `payload.error.code` for Amex error code
2. Check `payload.error.message` for description
3. Common causes:
   - Card not enrolled in rewards program
   - Amex service temporarily unavailable
   - Invalid card for rewards lookup

**Fix:**

```javascript
americanExpressInstance
  .getRewardsBalance({
    nonce: nonce,
  })
  .then(function (payload) {
    if (payload.error) {
      // Handle Amex-specific error
      console.log("Amex error:", payload.error.code, payload.error.message);
      // Don't show rewards option to customer
    } else {
      // Show rewards balance
      displayRewards(payload.rewardsAmount, payload.rewardsUnit);
    }
  });
```

## Implementation Examples

### Rewards Balance Display

```javascript
// Complete rewards balance implementation
var americanExpress = require("braintree-web/american-express");
var hostedFields = require("braintree-web/hosted-fields");

// Create client and components
Promise.all([
  hostedFields.create({
    /* config */
  }),
  americanExpress.create({ client: clientInstance }),
]).then(function (instances) {
  var hostedFieldsInstance = instances[0];
  var americanExpressInstance = instances[1];

  document
    .getElementById("checkout-btn")
    .addEventListener("click", function () {
      hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
        if (tokenizeErr) {
          console.error(tokenizeErr);
          return;
        }

        // Check if Amex card
        if (payload.details.cardType === "American Express") {
          // Fetch rewards balance
          americanExpressInstance
            .getRewardsBalance({
              nonce: payload.nonce,
            })
            .then(function (rewardsPayload) {
              if (rewardsPayload.error) {
                // Rewards not available for this card
                proceedToCheckout(payload.nonce);
                return;
              }

              // Display rewards option
              var rewardsAmount = rewardsPayload.rewardsAmount;
              var rewardsUnit = rewardsPayload.rewardsUnit;

              showRewardsOption(
                rewardsAmount,
                rewardsUnit,
                function (useRewards) {
                  if (useRewards) {
                    // Customer chose to use rewards
                    payload.useRewards = true;
                  }
                  proceedToCheckout(payload.nonce, payload.useRewards);
                }
              );
            })
            .catch(function (err) {
              // Error getting rewards, proceed without rewards option
              console.warn("Could not fetch rewards:", err);
              proceedToCheckout(payload.nonce);
            });
        } else {
          // Not an Amex card
          proceedToCheckout(payload.nonce);
        }
      });
    });
});
```

### Express Checkout Profile

```javascript
// Amex Express Checkout profile retrieval
var americanExpress = require("braintree-web/american-express");

americanExpress
  .create({
    client: clientInstance,
  })
  .then(function (americanExpressInstance) {
    // After Amex Express Checkout returns nonce
    window.onAmexCallback = function (amexNonce) {
      americanExpressInstance
        .getExpressCheckoutProfile({
          nonce: amexNonce,
        })
        .then(function (profilePayload) {
          var cards = profilePayload.amexExpressCheckoutCards;

          if (cards.length === 0) {
            console.log("No cards available");
            return;
          }

          // Display cards to user
          var cardList = document.getElementById("card-list");
          cards.forEach(function (card) {
            var option = document.createElement("div");
            option.textContent =
              "Amex ending in " +
              card.lastTwo +
              " (exp " +
              card.expirationMonth +
              "/" +
              card.expirationYear +
              ")";
            option.dataset.nonce = card.nonce;
            option.onclick = function () {
              // Use this card's nonce for payment
              submitPayment(card.nonce);
            };
            cardList.appendChild(option);
          });
        })
        .catch(function (err) {
          console.error("Error getting profile:", err);
        });
    };
  });
```

### With Teardown

```javascript
// Proper lifecycle management
var americanExpressInstance;

function initializeAmex() {
  return americanExpress
    .create({
      client: clientInstance,
    })
    .then(function (instance) {
      americanExpressInstance = instance;
      return instance;
    });
}

function cleanupAmex() {
  if (americanExpressInstance) {
    return americanExpressInstance.teardown().then(function () {
      americanExpressInstance = null;
      console.log("American Express cleaned up");
    });
  }
  return Promise.resolve();
}

// On page unload or SPA route change
window.addEventListener("beforeunload", cleanupAmex);
```

## Important Notes

### Nonce Types

**Critical:** This component works with TWO different types of nonces:

1. **Braintree Nonce** (for getRewardsBalance)
   - Obtained from: Hosted Fields, Drop-in UI, other Braintree components
   - Format: `tokencc_*` or similar Braintree nonce format
   - Used for: Checking rewards balance on already-tokenized Amex cards

2. **American Express Nonce** (for getExpressCheckoutProfile)
   - Obtained from: American Express Express Checkout flow
   - Source: Direct integration with Amex
   - Used for: Getting profile with list of customer's Amex cards

**Do not mix these up!** Using the wrong nonce type will result in API errors.

### Card Acceptance

- This component is for **Amex-specific features** only
- To accept American Express cards for payment, use **Hosted Fields** component
- This component does NOT handle card tokenization or payment processing
- Use this for value-added Amex features like rewards and express checkout

### Browser Support

- Works in all modern browsers (IE11+, Edge, Chrome, Firefox, Safari)
- No special browser APIs required
- Pure REST API integration with Braintree gateway
