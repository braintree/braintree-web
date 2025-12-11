# PayPal Component - CLAUDE.md (DEPRECATED)

This file provides component-specific guidance for working with the PayPal component. For project-wide conventions and commands, see `/CLAUDE.md`.

## ⚠️ DEPRECATION NOTICE

**This component is DEPRECATED. Use the PayPal Checkout component instead.**

**Migration Path:**

- Old: `braintree-web/paypal`
- New: `braintree-web/paypal-checkout`
- Documentation: See `/src/paypal-checkout/CLAUDE.md`

**Why deprecated:**

- PayPal Checkout uses the newer PayPal SDK
- Better features and user experience
- PayPal Checkout is actively maintained
- This legacy component is no longer recommended

## Overview

The legacy PayPal component provides PayPal integration using the older PayPal flow. This component opens a popup or redirect for PayPal authentication and returns a payment method nonce.

**Status:** Deprecated - use PayPal Checkout instead

**Key Features:**

- PayPal popup/redirect flows
- Vault and checkout flows
- Billing agreements
- One-time and recurring payments

For full documentation and modern PayPal integration, see `/src/paypal-checkout/CLAUDE.md`.

## Basic Migration Example

### Old (Deprecated)

```javascript
var paypal = require("braintree-web/paypal");

paypal.create(
  {
    client: clientInstance,
  },
  function (err, paypalInstance) {
    paypalInstance.tokenize(
      {
        flow: "vault",
      },
      function (err, payload) {
        // Use payload.nonce
      }
    );
  }
);
```

### New (Recommended)

```javascript
var paypalCheckout = require("braintree-web/paypal-checkout");

paypalCheckout.create(
  {
    client: clientInstance,
  },
  function (err, paypalCheckoutInstance) {
    paypalCheckoutInstance.tokenizePayment(
      {
        flow: "vault",
      },
      function (err, payload) {
        // Use payload.nonce
      }
    );
  }
);
```

## Key Differences

| Feature            | Legacy PayPal | PayPal Checkout      |
| ------------------ | ------------- | -------------------- |
| PayPal SDK         | Old SDK       | Modern PayPal JS SDK |
| Button Integration | Manual        | PayPal button.js     |
| User Experience    | Basic popup   | Enhanced UI          |
| Features           | Limited       | Full feature set     |
| Support            | Deprecated    | Active               |
| Documentation      | Minimal       | Comprehensive        |

## Action Required

**If you are using this component:**

1. Plan migration to PayPal Checkout component
2. Review PayPal Checkout documentation
3. Test new integration in sandbox
4. Deploy PayPal Checkout to production
5. Remove legacy PayPal component

**For new integrations:**

- Do NOT use this component
- Use PayPal Checkout from the start
- See `/src/paypal-checkout/CLAUDE.md`
