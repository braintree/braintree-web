# PayPal Checkout Component - CLAUDE.md

This file provides component-specific guidance for working with the PayPal Checkout component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

PayPal Checkout integrates with the [PayPal JavaScript SDK](https://developer.paypal.com/docs/checkout/) to provide a fully managed PayPal payment experience. This is the **current, recommended** PayPal integration (the older `paypal` component is deprecated).

**Key Features:**

- Integration with PayPal JS SDK buttons
- Checkout flow (one-time payments)
- Vault flow (save PayPal account for future use)
- Vault Initiated Checkout (VIC) for repeat customers
- PayPal Credit support
- Shipping and billing address collection
- Payment updates during checkout

**Docs:** [Braintree PayPal Guide](https://developer.paypal.com/braintree/docs/guides/paypal/overview)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `paypal-checkout.js` - Main PayPalCheckout class
- `errors.js` - PayPal Checkout error codes

**Note:** This is a relatively simple component (3 files) that acts as a bridge between Braintree and PayPal's SDK.

## Integration Architecture

### PayPal JS SDK Required

**Critical:** You must load PayPal's SDK on your page:

```html
<!-- Basic checkout -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD"></script>

<!-- With vault support -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true"></script>

<!-- With specific intent -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&intent=capture"></script>
```

**Query Parameters:**

- `client-id` (required): Your PayPal client ID from PayPal Dashboard
- `currency`: Currency code (default: USD)
- `vault`: Set to `true` for vaulting flows
- `intent`: `capture` or `authorize` (must match createPayment intent)
- `commit`: `true` or `false` for button behavior
- `disable-funding`: Comma-separated list of funding sources to hide

See [PayPal SDK documentation](https://developer.paypal.com/docs/checkout/reference/customize-sdk/) for all options.

### Integration Flow

```
1. Load PayPal JS SDK
   ↓
2. Create Braintree Client
   ↓
3. Create PayPalCheckout instance
   ↓
4. Render PayPal button with paypal.Buttons()
   ↓
5. User clicks button
   ↓
6. createOrder() creates payment
   ↓
7. PayPal SDK shows approval flow
   ↓
8. onApprove() tokenizes payment
   ↓
9. Send nonce to server
```

## Payment Flows

### 1. Checkout Flow (One-Time Payment)

**Use Case:** One-time transaction (e.g., ecommerce checkout)

**Setup:**

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>
<div id="paypal-button"></div>
```

**Implementation:**

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.paypalCheckout.create({
      client: clientInstance,
    });
  })
  .then(function (paypalCheckoutInstance) {
    return paypal
      .Buttons({
        // Braintree creates the PayPal payment
        createOrder: function () {
          return paypalCheckoutInstance.createPayment({
            flow: "checkout", // One-time payment
            amount: "10.00",
            currency: "USD",
            intent: "capture", // or 'authorize'
          });
        },

        // Tokenize after approval
        onApprove: function (data, actions) {
          return paypalCheckoutInstance
            .tokenizePayment(data)
            .then(function (payload) {
              // Submit payload.nonce to your server
              submitNonceToServer(payload.nonce);
            });
        },

        onCancel: function (data) {
          console.log("PayPal payment canceled");
        },

        onError: function (err) {
          console.error("PayPal error:", err);
        },
      })
      .render("#paypal-button");
  })
  .catch(function (err) {
    console.error("Error setting up PayPal:", err);
  });
```

**createPayment Options (Checkout):**

```javascript
{
  flow: 'checkout',  // Required
  amount: '10.00',  // Required - total amount
  currency: 'USD',  // Required
  intent: 'capture',  // or 'authorize' - must match SDK intent param

  // Optional - shipping
  enableShippingAddress: true,
  shippingAddressEditable: false,
  shippingAddressOverride: {
    recipientName: 'John Doe',
    line1: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60606',
    countryCode: 'US'
  },

  // Optional - line items
  lineItems: [
    {
      quantity: '1',
      unitAmount: '10.00',
      name: 'Product Name',
      kind: 'debit'  // or 'credit'
    }
  ]
}
```

### 2. Vault Flow (Save PayPal Account)

**Use Case:** Save customer's PayPal account for future payments (subscriptions, stored payment methods)

**Setup:**

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true"></script>
<div id="paypal-button"></div>
```

**Implementation:**

```javascript
braintree.paypalCheckout
  .create({
    client: clientInstance,
  })
  .then(function (paypalCheckoutInstance) {
    return paypal
      .Buttons({
        createBillingAgreement: function () {
          return paypalCheckoutInstance.createPayment({
            flow: "vault", // Vault flow
          });
        },

        onApprove: function (data, actions) {
          return paypalCheckoutInstance
            .tokenizePayment(data)
            .then(function (payload) {
              // Nonce represents vaulted PayPal account
              // Can be used for future transactions
              submitNonceToServer(payload.nonce);
            });
        },

        onCancel: function (data) {
          console.log("PayPal canceled");
        },

        onError: function (err) {
          console.error("PayPal error:", err);
        },
      })
      .render("#paypal-button");
  });
```

**createPayment Options (Vault):**

```javascript
{
  flow: 'vault',  // Required

  // Optional - billing agreement description
  billingAgreementDescription: 'Your agreement description',

  // Optional - shipping
  shippingAddressOverride: {
    recipientName: 'John Doe',
    line1: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60606',
    countryCode: 'US'
  }
}
```

### 3. Vault Initiated Checkout (VIC)

**Use Case:** Repeat customers who already have vaulted PayPal account - streamlined one-click checkout

**Requirements:**

- Customer has previously vaulted PayPal account
- You have the payment method token from previous vault

**Setup:**

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>
<button id="pay-now-button">Pay with PayPal</button>
```

**Implementation:**

```javascript
braintree.paypalCheckout
  .create({
    client: clientInstance,
  })
  .then(function (paypalCheckoutInstance) {
    payNowButton.addEventListener("click", function () {
      paypalCheckoutInstance
        .startVaultInitiatedCheckout({
          vaultInitiatedCheckoutPaymentMethodToken:
            "customer_payment_method_token",
          amount: "10.00",
          currency: "USD",
        })
        .then(function (payload) {
          // Payment approved and tokenized
          submitNonceToServer(payload.nonce);
        })
        .catch(function (err) {
          if (err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED") {
            console.log("Customer canceled");
          } else {
            console.error("VIC error:", err);
          }
        });
    });
  });
```

**startVaultInitiatedCheckout Options:**

```javascript
{
  vaultInitiatedCheckoutPaymentMethodToken: 'token',  // Required - from vault
  amount: '10.00',  // Required
  currency: 'USD',  // Required

  // Optional
  lineItems: [ /* ... */ ],
  shippingAddressOverride: { /* ... */ }
}
```

**Important:** Must be called in response to user interaction (click) to avoid popup blockers.

## Advanced Features

### Payment Updates

Update payment details during checkout (e.g., shipping cost changes):

```javascript
paypal
  .Buttons({
    createOrder: function () {
      return paypalCheckoutInstance.createPayment({
        flow: "checkout",
        amount: "10.00",
        currency: "USD",
      });
    },

    onShippingChange: function (data, actions) {
      // User changed shipping address
      var newShippingCost = calculateShipping(data.shipping_address);

      return paypalCheckoutInstance
        .updatePayment({
          amount: String(parseFloat("10.00") + newShippingCost),
        })
        .catch(function (err) {
          console.error("Update failed:", err);
        });
    },

    onApprove: function (data, actions) {
      return paypalCheckoutInstance
        .tokenizePayment(data)
        .then(function (payload) {
          submitNonceToServer(payload.nonce);
        });
    },
  })
  .render("#paypal-button");
```

### Auto Set Data User ID Token

For vaulted customers, automatically populate their PayPal account:

```javascript
// Generate client token with customer ID on server
var clientToken = gateway.clientToken.generate({
  customerId: "customer_123",
});

// Client-side
braintree.paypalCheckout
  .create({
    client: clientInstance,
    autoSetDataUserIdToken: true, // Enable auto-population
  })
  .then(function (paypalCheckoutInstance) {
    // PayPal button will show customer's vaulted account
  });
```

Requires:

- Client token (not tokenization key)
- Client token generated with customer ID
- Customer has previously vaulted PayPal account

### Merchant Account ID

Use non-default merchant account:

```javascript
braintree.paypalCheckout
  .create({
    client: clientInstance,
    merchantAccountId: "your_merchant_account_id",
  })
  .then(function (paypalCheckoutInstance) {
    // Will use specified merchant account for PayPal transactions
  });
```

## PayPal Credit

PayPal Credit is automatically available when enabled in your PayPal/Braintree account.

**Detecting PayPal Credit:**

```javascript
onApprove: function (data, actions) {
  return paypalCheckoutInstance.tokenizePayment(data)
    .then(function (payload) {
      if (payload.creditFinancingOffered) {
        // Customer used PayPal Credit
        console.log('Term:', payload.creditFinancingOffered.term);
        console.log('Monthly payment:', payload.creditFinancingOffered.monthlyPayment.value);
      }

      submitNonceToServer(payload.nonce);
    });
}
```

**Credit Financing Details:**

```javascript
payload.creditFinancingOffered = {
  totalCost: {
    value: "120.00",
    currency: "USD",
  },
  term: 6, // months
  monthlyPayment: {
    value: "20.00",
    currency: "USD",
  },
  totalInterest: {
    value: "20.00",
    currency: "USD",
  },
  payerAcceptance: true,
  cartAmountImmutable: false,
};
```

## Error Handling

### Error Codes

From `errors.js`:

**Creation Errors:**

1. **`PAYPAL_NOT_ENABLED`** (MERCHANT)
   - PayPal not enabled in Braintree control panel
   - Fix: Enable PayPal in merchant settings

2. **`PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED`** (MERCHANT)
   - Sandbox testing without linked PayPal sandbox account
   - Fix: Link PayPal sandbox account in Braintree control panel
   - See: [PayPal Sandbox Linking Guide](https://developer.paypal.com/braintree/docs/guides/paypal/testing-go-live#linked-paypal-testing)

**createPayment Errors:**

3. **`PAYPAL_FLOW_OPTION_REQUIRED`** (MERCHANT)
   - Missing or invalid `flow` option
   - Fix: Provide `flow: 'checkout'` or `flow: 'vault'`

4. **`PAYPAL_INVALID_PAYMENT_OPTION`** (MERCHANT)
   - Invalid option value (e.g., negative amount, wrong currency format)
   - Fix: Verify all option values match requirements

5. **`PAYPAL_FLOW_FAILED`** (NETWORK)
   - Network error creating PayPal payment
   - Fix: Check network, retry

**Vault Initiated Checkout Errors:**

6. **`PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED`** (MERCHANT)
   - Missing required parameter (amount, currency, or token)
   - Fix: Provide all required params

7. **`PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED`** (MERCHANT)
   - Popup blocked or not called from user interaction
   - Fix: Ensure method called in response to click event

8. **`PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED`** (CUSTOMER)
   - Customer closed PayPal popup
   - Handling: Allow retry

9. **`PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS`** (MERCHANT)
   - Called while flow already in progress
   - Fix: Track flow state, prevent duplicate calls

10. **`PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED`** (NETWORK)
    - Network error setting up VIC flow
    - Fix: Check network, retry

**Tokenization Errors:**

11. **`PAYPAL_ACCOUNT_TOKENIZATION_FAILED`** (NETWORK)
    - Failed to tokenize PayPal account
    - Fix: Retry, check logs for details

**Update Payment Errors:**

12. **`PAYPAL_MISSING_REQUIRED_OPTION`** (MERCHANT)
    - Missing required option in updatePayment()
    - Fix: Provide required options

13. **`PAYPAL_INVALID_PAYMENT_OPTION`** (MERCHANT)
    - Invalid option in updatePayment()
    - Fix: Verify option values

## Testing

### Sandbox Setup

**1. Link PayPal Sandbox Account:**

- In Braintree sandbox control panel
- Go to Processing > PayPal
- Click "Link PayPal Sandbox"
- Follow instructions to link

**2. Use Sandbox Client ID:**

```html
<script src="https://www.sandbox.paypal.com/sdk/js?client-id=SANDBOX_CLIENT_ID"></script>
```

**3. PayPal Sandbox Accounts:**

- Create test buyer accounts in PayPal Developer Dashboard
- Use test accounts to complete payments

### Unit Tests

Location: `test/paypal-checkout/unit/`

**Test Categories:**

- Component creation
- createPayment() with various options
- tokenizePayment()
- startVaultInitiatedCheckout()
- updatePayment()
- Error scenarios

### Integration Tests

Tests actual PayPal SDK integration (mocked):

- Button rendering
- Payment creation flows
- Tokenization
- VIC flow

## Debugging

### Common Issues

**1. PayPal Button Not Rendering**

**Symptoms:**

- No button appears in container

**Debug:**

1. Verify PayPal SDK loaded: Check `window.paypal` exists
2. Check client ID in SDK URL
3. Verify container exists: `document.querySelector('#paypal-button')`
4. Check browser console for errors
5. Ensure `render()` is called after button creation

**2. Popup Blocked**

**Symptoms:**

- `PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED`
- No PayPal window opens

**Fix:**

```javascript
// Ensure VIC called directly from click event
button.addEventListener("click", function (event) {
  // Don't do async work before calling startVaultInitiatedCheckout
  paypalCheckoutInstance.startVaultInitiatedCheckout({
    // ...
  });
});
```

**3. Sandbox Account Not Linked Error**

**Symptoms:**

- `PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED` on create

**Fix:**

1. Go to Braintree sandbox control panel
2. Navigate to Settings > Processing > PayPal
3. Click "Link PayPal Sandbox"
4. Complete linking process

**4. Intent Mismatch**

**Symptoms:**

- Payment fails or shows unexpected behavior

**Fix:**

```javascript
// SDK intent param must match createPayment intent
// SDK:
<script src="https://www.paypal.com/sdk/js?client-id=...&intent=capture"></script>;

// createPayment:
createPayment({
  flow: "checkout",
  amount: "10.00",
  intent: "capture", // Must match SDK intent
});
```

**5. Currency Mismatch**

**Symptoms:**

- Payment creation fails
- Currency errors

**Fix:**

```javascript
// SDK currency must match createPayment currency
// SDK:
<script src="https://www.paypal.com/sdk/js?client-id=...&currency=USD"></script>;

// createPayment:
createPayment({
  flow: "checkout",
  amount: "10.00",
  currency: "USD", // Must match SDK currency
});
```

## Implementation Examples

### Basic Checkout

```javascript
// Most common integration
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.paypalCheckout.create({
      client: clientInstance,
    });
  })
  .then(function (paypalCheckoutInstance) {
    return paypal
      .Buttons({
        createOrder: function () {
          return paypalCheckoutInstance.createPayment({
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
            intent: "capture",
          });
        },
        onApprove: function (data) {
          return paypalCheckoutInstance
            .tokenizePayment(data)
            .then(function (payload) {
              // Send to server
              return fetch("/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nonce: payload.nonce }),
              });
            });
        },
      })
      .render("#paypal-button");
  });
```

### With Shipping Address

```javascript
createOrder: function () {
  return paypalCheckoutInstance.createPayment({
    flow: 'checkout',
    amount: '10.00',
    currency: 'USD',
    enableShippingAddress: true,
    shippingAddressOverride: {
      recipientName: 'John Doe',
      line1: '123 Main St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60606',
      countryCode: 'US'
    }
  });
}
```

### Vault Flow for Subscriptions

```javascript
paypal
  .Buttons({
    createBillingAgreement: function () {
      return paypalCheckoutInstance.createPayment({
        flow: "vault",
        billingAgreementDescription: "Monthly subscription to Premium Service",
      });
    },
    onApprove: function (data) {
      return paypalCheckoutInstance
        .tokenizePayment(data)
        .then(function (payload) {
          // Vault the nonce for future charges
          return fetch("/subscribe", {
            method: "POST",
            body: JSON.stringify({
              nonce: payload.nonce,
              plan: "premium-monthly",
            }),
          });
        });
    },
  })
  .render("#subscribe-button");
```

### One-Click Repeat Purchase (VIC)

```javascript
// Customer clicks "Buy Again"
buyAgainButton.addEventListener("click", function () {
  paypalCheckoutInstance
    .startVaultInitiatedCheckout({
      vaultInitiatedCheckoutPaymentMethodToken: savedPaymentMethodToken,
      amount: "19.99",
      currency: "USD",
    })
    .then(function (payload) {
      // Payment complete, no PayPal login required
      submitOrder(payload.nonce);
    })
    .catch(function (err) {
      if (err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED") {
        // Customer canceled
      } else {
        console.error(err);
      }
    });
});
```

## Migration from Legacy PayPal Component

If migrating from the deprecated `paypal` component:

**Old (paypal):**

```javascript
braintree.paypal.create({ client }).then(function (paypalInstance) {
  paypalInstance.tokenize({ flow: "checkout" }, callback);
});
```

**New (paypal-checkout):**

```javascript
braintree.paypalCheckout
  .create({ client })
  .then(function (paypalCheckoutInstance) {
    paypal
      .Buttons({
        createOrder: function () {
          return paypalCheckoutInstance.createPayment({ flow: "checkout" });
        },
        onApprove: function (data) {
          return paypalCheckoutInstance.tokenizePayment(data);
        },
      })
      .render("#paypal-button");
  });
```

**Key Differences:**

- Requires PayPal JS SDK on page
- Button rendering managed by PayPal SDK
- Separate `createPayment()` and `tokenizePayment()` methods
- Better UX with PayPal's managed UI
