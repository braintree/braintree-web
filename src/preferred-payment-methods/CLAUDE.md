# Preferred Payment Methods Component - CLAUDE.md

This file provides component-specific guidance for working with the Preferred Payment Methods component. For project-wide conventions and commands, see `/CLAUDE.md`.

## ⚠️ NOTICE

**This component is in non-operational beta and marked for removal.**

From code comments (`index.js:9-10`):

> NEXT_MAJOR_VERSION
> Remove this integration entirely. It doesn't work, isn't documented, and otherwise isn't going to be pursued further beyond the non-operational beta it is in.

**Status:** Non-operational beta (to be removed)

## Overview

The Preferred Payment Methods component was intended to detect which payment methods (PayPal, Venmo) are preferred on a customer's device. However, this component is **non-operational** and will be removed in a future major version.

**Do NOT use this component for new integrations.**

## What It Was Supposed To Do

The component intended to provide:

- Detection of PayPal preference on device
- Detection of Venmo preference on device
- UI prioritization hints

```javascript
// EXAMPLE - DO NOT USE (non-functional)
preferredPaymentMethodsInstance
  .fetchPreferredPaymentMethods()
  .then(function (result) {
    if (result.paypalPreferred) {
      // Show PayPal prominently
    }
    if (result.venmoPreferred) {
      // Show Venmo prominently
    }
  });
```

## Why It Doesn't Work

- Component is marked as non-operational
- Not documented in official Braintree docs
- Will be removed in next major version
- No support or maintenance

## Alternatives

For payment method detection and prioritization:

1. **Use Platform Detection:**
   - Check `navigator.platform` for mobile vs desktop
   - Show Venmo on mobile, PayPal on desktop

2. **User Preference Storage:**
   - Store customer's previous payment method choice
   - Show last-used method first

3. **A/B Testing:**
   - Test different payment method orderings
   - Use analytics to determine best default

4. **Component-Specific Detection:**
   - Venmo: Use `braintree-web/venmo` `isBrowserSupported()`
   - PayPal: Always available via `braintree-web/paypal-checkout`
   - Apple Pay: Check `window.ApplePaySession`
   - Google Pay: Use `braintree-web/google-payment`

## Example Alternative Implementation

```javascript
// Recommended approach - platform-based prioritization
function getPrioritizedPaymentMethods() {
  var methods = [];

  // Mobile detection
  var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Prioritize mobile-friendly methods
    methods.push("venmo");
    methods.push("paypal");
    methods.push("card");
  } else {
    // Desktop prioritization
    methods.push("paypal");
    methods.push("card");
  }

  // Apple Pay (if available)
  if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
    methods.unshift("applePay");
  }

  return methods;
}
```

## Files Reference

- `src/preferred-payment-methods/index.js:9` - Removal notice
- `src/preferred-payment-methods/preferred-payment-methods.js:1` - Non-functional class

## Action Required

**If you are using this component:**

1. Remove from your code immediately
2. Implement alternative detection logic (see above)
3. Update checkout UI

**For new integrations:**

- Do NOT use this component
- Use alternatives listed above
