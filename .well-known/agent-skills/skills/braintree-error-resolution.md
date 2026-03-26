---
name: braintree-error-resolution
description: Complete error code reference and resolution guide for all Braintree Web SDK components - maps every error to its fix
---

# Error Resolution Guide

## Error Type Taxonomy

All errors are `BraintreeError` instances. Check `err.type` for category, `err.code` for specific error:

| Type | Meaning | Action |
|------|---------|--------|
| `CUSTOMER` | End-user input/action problem | Show message to user, allow retry |
| `MERCHANT` | Integration/configuration error | Fix integration code or Braintree settings |
| `NETWORK` | Connectivity/timeout issue | Retry with exponential backoff |
| `INTERNAL` | SDK bug | Report to Braintree support |
| `UNKNOWN` | Indeterminate cause | Check `err.details`, investigate logs |

## Shared Errors (All Components)

| Code | Type | Resolution |
|------|------|-----------|
| `INCOMPATIBLE_VERSIONS` | MERCHANT | All SDK components must use the same version. Check CDN script tags or npm imports. |
| `INSTANTIATION_OPTION_REQUIRED` | MERCHANT | Missing `client` or `authorization` in create options. |
| `CLIENT_SCRIPT_FAILED_TO_LOAD` | NETWORK | Network error loading client script. Check internet, CSP policy, CDN availability. |
| `METHOD_CALLED_AFTER_TEARDOWN` | MERCHANT | Instance was torn down. Create a new instance before calling methods. |
| `INSTANTIATION_OPTION_INVALID` | MERCHANT | Bad option value passed to create. Check the option types and formats. |

## Client Errors

| Code | Type | Resolution |
|------|------|-----------|
| `CLIENT_INVALID_AUTHORIZATION` | MERCHANT | Authorization string cannot be parsed. Verify it is a valid tokenization key (`sandbox_xxx_yyy`) or base64-encoded client token. |
| `CLIENT_AUTHORIZATION_INVALID` | MERCHANT | Token expired or deleted. **Client tokens expire ~24h.** Generate a fresh one from your server. Tokenization keys: check they are not deactivated in control panel. |
| `CLIENT_GATEWAY_NETWORK` | NETWORK | Cannot reach Braintree gateway. Check internet, firewall, DNS. Retry with backoff. |
| `CLIENT_REQUEST_TIMEOUT` | NETWORK | Request exceeded 60-second timeout. Check network speed. Retry. |
| `CLIENT_REQUEST_ERROR` | NETWORK | Server returned HTTP 400+. Check `err.details` for server error message. |
| `CLIENT_GRAPHQL_REQUEST_ERROR` | NETWORK | GraphQL error. Check `err.details` for specific GraphQL errors. |
| `CLIENT_RATE_LIMITED` | MERCHANT | HTTP 429. Too many requests. Implement exponential backoff. |
| `CLIENT_AUTHORIZATION_INSUFFICIENT` | MERCHANT | Authorization lacks permissions. Use client token instead of tokenization key for features requiring elevated permissions (3DS, vaulting). |

## Hosted Fields Errors

| Code | Type | Resolution |
|------|------|-----------|
| `HOSTED_FIELDS_TIMEOUT` | UNKNOWN | Iframe setup took >60s. Check CSP allows `assets.braintreegateway.com` in `frame-src`. Verify network. |
| `HOSTED_FIELDS_INVALID_FIELD_KEY` | MERCHANT | Field name not recognized. Valid keys: `number`, `cvv`, `expirationDate`, `expirationMonth`, `expirationYear`, `postalCode`, `cardholderName`. |
| `HOSTED_FIELDS_INVALID_FIELD_SELECTOR` | MERCHANT | CSS selector not found in DOM. Ensure container element exists before calling create. |
| `HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME` | MERCHANT | Container already has a Hosted Fields iframe. Don't call create twice on same elements. Teardown first. |
| `HOSTED_FIELDS_FIELDS_EMPTY` | CUSTOMER | All fields empty when tokenize called. Prompt user to enter card data. |
| `HOSTED_FIELDS_FIELDS_INVALID` | CUSTOMER | One or more fields failed validation. Check `getState()` for which fields are invalid. |
| `HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR` | NETWORK | Gateway unreachable during tokenization. Retry. |
| `HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE` | CUSTOMER | Card already exists in vault. Use existing payment method or allow user to override. |
| `HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED` | CUSTOMER | CVV check failed. Ask user to re-enter CVV. |

## 3D Secure Errors

| Code | Type | Resolution |
|------|------|-----------|
| `THREEDS_NOT_ENABLED` | MERCHANT | Enable 3DS in Braintree control panel. Contact support if needed. |
| `THREEDS_CAN_NOT_USE_TOKENIZATION_KEY` | MERCHANT | 3DS requires a client token. Generate one from your server. |
| `THREEDS_HTTPS_REQUIRED` | MERCHANT | Serve page over HTTPS. |
| `THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED` | NETWORK | CSP must allow `script-src: songbird.cardinalcommerce.com`. Check for ad blockers. |
| `THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT` | UNKNOWN | Cardinal took >60s to initialize. Check network. |
| `THREEDS_AUTHENTICATION_IN_PROGRESS` | MERCHANT | `verifyCard` called while another is running. Wait for completion. |
| `THREEDS_MISSING_VERIFY_CARD_OPTION` | MERCHANT | Provide `nonce`, `bin`, and `amount` to verifyCard. |
| `THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR` | MERCHANT | Nonce invalid or already consumed. Use a fresh nonce from tokenization. |
| `THREEDS_CARDINAL_SDK_CANCELED` | CUSTOMER | User closed the challenge modal. Allow retry. |

## PayPal Errors

| Code | Type | Resolution |
|------|------|-----------|
| `PAYPAL_NOT_ENABLED` | MERCHANT | Enable PayPal in Braintree control panel. |
| `PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED` | MERCHANT | Link PayPal sandbox account in Settings > Processing > PayPal. |
| `PAYPAL_FLOW_OPTION_REQUIRED` | MERCHANT | Provide `flow: 'checkout'` or `flow: 'vault'`. |
| `PAYPAL_FLOW_FAILED` | NETWORK | Network error creating payment. Retry. |
| `PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED` | MERCHANT | Call from direct click handler. Check popup blockers. |
| `PAYPAL_ACCOUNT_TOKENIZATION_FAILED` | NETWORK | Tokenization failed. Retry. |

## Venmo Errors

| Code | Type | Resolution |
|------|------|-----------|
| `VENMO_NOT_ENABLED` | MERCHANT | Enable Venmo in Braintree control panel. |
| `VENMO_APP_CANCELED` / `VENMO_CUSTOMER_CANCELED` / `VENMO_DESKTOP_CANCELED` | CUSTOMER | User cancelled. Allow retry. |
| `VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT` | CUSTOMER | User took >5 minutes. Allow retry. |
| `VENMO_TOKENIZATION_REQUEST_ACTIVE` | MERCHANT | Already tokenizing. Wait for completion. |
| `VENMO_ECD_DISABLED` | MERCHANT | Enable Enriched Customer Data in merchant settings. |

## Apple Pay / Google Pay Errors

| Code | Type | Resolution |
|------|------|-----------|
| `APPLE_PAY_NOT_ENABLED` | MERCHANT | Enable Apple Pay in control panel. |
| `APPLE_PAY_MERCHANT_VALIDATION_FAILED` | MERCHANT | Register exact domain (including subdomain) in Braintree control panel. |
| `GOOGLE_PAYMENT_NOT_ENABLED` | MERCHANT | Enable Google Pay in control panel. |
| `GOOGLE_PAYMENT_GATEWAY_ERROR` | UNKNOWN | Check authorization, network. Inspect `err.details`. |

## Common issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Authorization expiry | `CLIENT_AUTHORIZATION_INVALID` after ~24h | Generate fresh client token from server |
| CSP blocking iframes | `HOSTED_FIELDS_TIMEOUT` | Add `frame-src: assets.braintreegateway.com` to CSP |
| CSP blocking Cardinal | `THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED` | Add `script-src: songbird.cardinalcommerce.com` to CSP |
| Version mismatch | `INCOMPATIBLE_VERSIONS` | Use same SDK version for all components |
| Popup blockers | `POPUP_OPEN_FAILED` errors | Call payment methods from direct click handlers, not async callbacks |
| Intent/currency mismatch | PayPal payment fails silently | Ensure PayPal SDK query params match `createPayment` options |
| Consumed nonce | `THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR` | 3DS consumes original nonce. Always use nonce from `verifyCard` result. |
| Rate limiting | `CLIENT_RATE_LIMITED` | Implement exponential backoff: wait 1s, 2s, 4s between retries |

## Error Handling Pattern

```javascript
function handleError(err) {
  if (err.type === 'CUSTOMER') {
    showUserMessage(err.message);
  } else if (err.type === 'NETWORK') {
    retryWithBackoff(err);
  } else if (err.type === 'MERCHANT') {
    console.error('Integration error:', err.code, err.message);
  }
}
```
