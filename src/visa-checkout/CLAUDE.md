# Visa Checkout Component - CLAUDE.md (DEPRECATED)

This file provides component-specific guidance for working with the Visa Checkout component. For project-wide conventions and commands, see `/CLAUDE.md`.

## ⚠️ DEPRECATION NOTICE

**This component is DEPRECATED. Visa has discontinued the Visa Checkout service.**

**Status:** Beta (deprecated)
**Service Status:** Discontinued by Visa

**What happened:**

- Visa discontinued Visa Checkout in 2020
- Replaced with "Click to Pay" (EMVCo standard)
- This SDK component is no longer functional
- No migration path within braintree-web

## Overview

The Visa Checkout component provided integration with Visa's Visa Checkout digital wallet service. Visa Checkout allowed customers to store their payment and shipping information for faster checkout.

**This component no longer works** as the Visa Checkout service has been discontinued.

## Alternatives

For digital wallet payments, consider:

1. **Google Pay** - See `/src/google-payment/CLAUDE.md`
2. **Apple Pay** - See `/src/apple-pay/CLAUDE.md`
3. **PayPal** - See `/src/paypal-checkout/CLAUDE.md`
4. **Venmo** - See `/src/venmo/CLAUDE.md`

## Files Reference

- `src/visa-checkout/index.js:1` - Deprecated component (non-functional)
- `src/visa-checkout/visa-checkout.js:1` - Main class (non-functional)

## Action Required

**If you are using this component:**

1. Remove Visa Checkout integration from your code
2. Implement alternative digital wallet (Google Pay, Apple Pay, PayPal)
3. Update checkout UI to remove Visa Checkout button
4. Communicate change to customers if needed

**For new integrations:**

- Do NOT use this component
- Choose from active digital wallet options listed above
