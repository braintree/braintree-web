# Masterpass Component - CLAUDE.md (DEPRECATED)

This file provides component-specific guidance for working with the Masterpass component. For project-wide conventions and commands, see `/CLAUDE.md`.

## ⚠️ DEPRECATION NOTICE

**This component is DEPRECATED. Mastercard has discontinued the Masterpass service.**

**Status:** Beta (deprecated)
**Service Status:** Discontinued by Mastercard

**What happened:**

- Mastercard discontinued Masterpass in 2019
- Replaced with "Click to Pay" (EMVCo standard)
- This SDK component is no longer functional
- No migration path within braintree-web

## Overview

The Masterpass component provided integration with Mastercard's Masterpass digital wallet service. Masterpass allowed customers to store their payment and shipping information for faster checkout.

**This component no longer works** as the Masterpass service has been discontinued.

## Alternatives

For digital wallet payments, consider:

1. **Google Pay** - See `/src/google-payment/CLAUDE.md`
2. **Apple Pay** - See `/src/apple-pay/CLAUDE.md`
3. **PayPal** - See `/src/paypal-checkout/CLAUDE.md`
4. **Venmo** - See `/src/venmo/CLAUDE.md`

## Files Reference

- `src/masterpass/index.js:1` - Deprecated component (non-functional)
- `src/masterpass/external/masterpass.js:1` - Main class (non-functional)

## Action Required

**If you are using this component:**

1. Remove Masterpass integration from your code
2. Implement alternative digital wallet (Google Pay, Apple Pay, PayPal)
3. Update checkout UI to remove Masterpass button
4. Communicate change to customers if needed

**For new integrations:**

- Do NOT use this component
- Choose from active digital wallet options listed above
