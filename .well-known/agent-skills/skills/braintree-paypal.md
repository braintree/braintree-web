---
name: braintree-paypal
description: PayPal integration via paypal-checkout and paypal-checkout-v6 - checkout, vault, and VIC flows
---

# PayPal Integration

## Component Choice

| Component          | Status               | SDK Loading              | Auth Required                    |
| ------------------ | -------------------- | ------------------------ | -------------------------------- |
| `paypalCheckout`   | Stable, recommended  | External `<script>` tag  | Tokenization key or client token |
| `paypalCheckoutV6` | Newer, session-based | `loadPayPalSDK()` method | Client token only                |
| `paypal`           | **Deprecated**       | Built-in popup           | Do not use                       |

## PayPal Checkout (paypal-checkout)

### Setup

Load PayPal JS SDK on the page. Query params must match `createPayment` options:

```html
<!-- Checkout flow -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD&intent=capture"></script>

<!-- Vault flow -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true"></script>
```

### Checkout Flow (One-Time Payment)

```javascript
braintree.client
  .create({ authorization: CLIENT_TOKEN })
  .then(function (clientInstance) {
    return braintree.paypalCheckout.create({ client: clientInstance });
  })
  .then(function (paypalCheckoutInstance) {
    return paypal
      .Buttons({
        createOrder: function () {
          return paypalCheckoutInstance.createPayment({
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
            intent: "capture", // Must match SDK intent param
          });
        },
        onApprove: function (data) {
          return paypalCheckoutInstance
            .tokenizePayment(data)
            .then(function (payload) {
              // payload.nonce -- send to server
              submitNonceToServer(payload.nonce);
            });
        },
        onCancel: function () {
          console.log("Cancelled");
        },
        onError: function (err) {
          console.error(err);
        },
      })
      .render("#paypal-button");
  });
```

### Vault Flow (Save PayPal Account)

```javascript
paypal
  .Buttons({
    createBillingAgreement: function () {
      return paypalCheckoutInstance.createPayment({
        flow: "vault",
        billingAgreementDescription: "Monthly subscription",
      });
    },
    onApprove: function (data) {
      return paypalCheckoutInstance
        .tokenizePayment(data)
        .then(function (payload) {
          // Nonce represents vaulted PayPal account
          submitNonceToServer(payload.nonce);
        });
    },
  })
  .render("#paypal-button");
```

### Vault Initiated Checkout (VIC)

For repeat customers with vaulted PayPal accounts:

```javascript
// MUST be called from a click handler (popup blocker prevention)
buyAgainButton.addEventListener("click", function () {
  paypalCheckoutInstance
    .startVaultInitiatedCheckout({
      vaultInitiatedCheckoutPaymentMethodToken: savedToken,
      amount: "19.99",
      currency: "USD",
    })
    .then(function (payload) {
      submitNonceToServer(payload.nonce);
    })
    .catch(function (err) {
      if (err.code === "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED") {
        // Customer cancelled
      }
    });
});
```

### Shipping Updates

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
    onShippingChange: function (data) {
      var newTotal = calculateShipping(data.shipping_address);
      return paypalCheckoutInstance.updatePayment({ amount: String(newTotal) });
    },
    onApprove: function (data) {
      return paypalCheckoutInstance.tokenizePayment(data);
    },
  })
  .render("#paypal-button");
```

### PayPal Credit Detection

```javascript
// In onApprove:
paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
  if (payload.creditFinancingOffered) {
    console.log(
      "PayPal Credit used, term:",
      payload.creditFinancingOffered.term
    );
  }
});
```

## Common Errors

| Code                                                      | Type     | Fix                                                |
| --------------------------------------------------------- | -------- | -------------------------------------------------- |
| `PAYPAL_NOT_ENABLED`                                      | MERCHANT | Enable PayPal in Braintree control panel           |
| `PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED`                       | MERCHANT | Link PayPal sandbox account in control panel       |
| `PAYPAL_FLOW_OPTION_REQUIRED`                             | MERCHANT | Provide `flow: 'checkout'` or `flow: 'vault'`      |
| `PAYPAL_FLOW_FAILED`                                      | NETWORK  | Check network, retry                               |
| `PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED` | MERCHANT | Call from user click handler, check popup blockers |
| `PAYPAL_ACCOUNT_TOKENIZATION_FAILED`                      | NETWORK  | Retry tokenization                                 |

## Common issues

1. **Popup blocking (most common drop-off cause):** Browsers block popups that are not in the direct synchronous execution path of a user click. Never call `braintree.client.create()` or `braintree.paypalCheckout.create()` inside a click handler -- pre-initialize both at page load so that payment flows are immediate when the user clicks. Safari blocks popups by default with no user-visible error. When using Smart Payment Buttons (recommended), the PayPal JS SDK renders inside an iframe and avoids popup blocking for the main checkout flow. VIC and legacy `tokenize()` flows open popups and are especially susceptible.
2. **Intent mismatch:** SDK `intent` param must match `createPayment` intent. Mismatch causes silent failures.
3. **Currency mismatch:** SDK `currency` param must match `createPayment` currency.
4. **Sandbox testing:** Link PayPal sandbox account in Braintree control panel before testing.

## Migration from Legacy `paypal` Component

```javascript
// OLD (deprecated):
braintree.paypal.create({ client }).then(function (paypalInstance) {
  paypalInstance.tokenize({ flow: "checkout" }, callback);
});

// NEW (paypal-checkout):
braintree.paypalCheckout.create({ client }).then(function (ppCheckout) {
  paypal
    .Buttons({
      createOrder: function () {
        return ppCheckout.createPayment({
          flow: "checkout",
          amount: "10.00",
          currency: "USD",
        });
      },
      onApprove: function (data) {
        return ppCheckout.tokenizePayment(data);
      },
    })
    .render("#paypal-button");
});
```

Key differences: Requires external PayPal JS SDK, button rendering managed by PayPal, separate `createPayment`/`tokenizePayment` methods.
