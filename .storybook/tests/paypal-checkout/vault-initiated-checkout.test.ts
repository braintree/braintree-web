/**
 * DEFERRED: VaultInitiatedCheckout (VIC) integration tests.
 *
 * What VIC is:
 *  - Legacy-only `paypal-checkout` feature exposed as
 *    `startVaultInitiatedCheckout` / `closeVaultInitiatedCheckoutWindow` /
 *    `focusVaultInitiatedCheckoutWindow` on the PayPalCheckout instance.
 *  - Lets a merchant initiate a PayPal checkout against a previously vaulted
 *    billing agreement, opening a popup managed by Frame Service.
 *
 * Why it's not covered here:
 *  1. The VaultInitiatedCheckout Storybook story (.storybook/stories/
 *     PayPalCheckout/PayPalCheckout.stories.ts) requires a human to type
 *     real merchant public key, private key, and customer id into a form,
 *     and then calls Braintree GraphQL directly to mint a client token from
 *     those credentials. Without those values no PayPal flow can start.
 *  2. The required env vars (e.g. PAYPAL_TEST_MERCHANT_PUBLIC_KEY /
 *     _PRIVATE_KEY) are not in .env today and adding them is out of scope
 *     for DTBTWEB-1319.
 *  3. The story is a multi-step developer demo (Step 1 init → Step 2 vault →
 *     Step 3 VIC). Exercising the full path roughly doubles the work of a
 *     normal checkout test (vault flow + VIC flow back-to-back, both
 *     requiring sandbox login and approval).
 *  4. There is NO V6 counterpart — paypal-checkout-v6 does not expose
 *     startVaultInitiatedCheckout and the V6 Storybook stories don't
 *     include this flow. So unlike the rest of this suite, there's no
 *     existing pattern to mirror.
 *
 * How to revisit later (pick one when prioritized):
 *  Option A — env-var driven, no story changes:
 *    1. Add PAYPAL_TEST_MERCHANT_PUBLIC_KEY and PAYPAL_TEST_MERCHANT_PRIVATE_KEY
 *       to .env and document them in .storybook/CLAUDE.md and the root
 *       CLAUDE.md.
 *    2. New test file fills the form via Playwright (#public-key,
 *       #private-key, #customer-id), clicks #initialize-btn, runs vault
 *       flow on #paypal-vault-button, then VIC on #checkout-btn.
 *    3. Reuse the existing PayPalCheckoutPage for popup login/approve.
 *
 *  Option B — story instrumentation:
 *    1. Modify the VIC story to auto-fill credentials from import.meta.env
 *       when present (similar to how other stories read
 *       STORYBOOK_BRAINTREE_TOKENIZATION_KEY).
 *    2. Tests then just navigate to the story URL and proceed — no form
 *       filling.
 *    3. Slightly more story-side work but cleaner test code.
 *
 * Either approach should ship as a follow-up ticket. This file exists so
 * the deferral is discoverable alongside the rest of the suite.
 */

export {};
