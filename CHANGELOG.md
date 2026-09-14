# CHANGELOG

All notable changes to this project will be documented in this file.

This is the changelog for major version V4. For V3 changelog history, see the [`v3.x`](https://github.com/braintree/braintree-web/blob/v3.x/CHANGELOG.md) branch.

## 4.0.0-alpha.0 (2026-09-14)

Web SDK v4.0.0 is a major release. See [MIGRATION.md](MIGRATION.md) for additional documentation on how to upgrade to this new release.

### Added

- General
  - Recover popup and deferred client-load flows after a mobile background or resume
  - Publish source maps for the CDN component bundles
- 3D Secure (3DS)
  - Add `challengeDisplay` option. Valid values are `'modal'` (default, Cardinal-managed modal) and `'inline-iframe'` (merchant-placed iframe).
- Apple Pay
  - Automatically load Apple's Apple Pay JS SDK (`1.latest`) to enable Apple Pay in non-Safari browsers and cross-device (QR) flows. Add `loadApplePaySDK` option (default `true`) to opt out.
  - Add `applePayCapabilities()` to check the customer's payment capability, replacing the deprecated `ApplePaySession.canMakePaymentsWithActiveCard` pattern. Add `APPLE_PAY_SDK_NOT_LOADED` error.
- Client
  - **Breaking:** Add explicit error types for several classes of network request errors. New error types: `CLIENT_AUTHORIZATION_INVALID`, `CLIENT_AUTHORIZATION_INSUFFICIENT`, `CLIENT_RATE_LIMITED` and `CLIENT_REQUEST_ERROR`. These new errors are more specific errors previously reported as generic `CLIENT_GRAPHQL_REQUEST_ERROR` or `CLIENT_GATEWAY_NETWORK` errors.
- Local Payment
  - `correlationId`/`riskCorrelationId` no longer required for `startPayment`; `riskCorrelationId` preferred
    - While `correlationId` has been marked deprecated, if it is provided it will be duplicated into `riskCorrelationId`
    - `riskCorrelationId` will ultimately fall back to the session id if `correlationId` is not provided

### Changed

- General
  - **Breaking:** Build the npm distribution to ES2017 instead of ES5
- 3D Secure (3DS)
  - **Breaking:** Rename `THREEDS_UNRECOGNIZED_VERSION` error code to `THREEDS_CHALLENGE_DISPLAY_INVALID`
  - **Breaking:** Change `authentication-iframe-available` event handler signature. The handler now receives a single `payload` object instead of separate `(event, next)` arguments.
  - **Breaking:** Change `lookup-complete` event handler signature. The handler now receives a single `payload` object instead of separate `(data, next)` arguments.
- Client
  - **Breaking:** Replace `XMLHttpRequest` with `Fetch API` in network request layer
  - **Breaking:** Rename `androidPay` configuration property to `googlePay` and expose it in its native GraphQL shape (`googleAuthorization`, `supportedCardBrands`).
  - **Breaking:** Rename `payWithVenmo` configuration property to `venmo` and expose it in its native GraphQL shape.
  - **Breaking:** Combine `challenges` and `creditCards` configuration properties into a single `creditCard` property, exposed in its native GraphQL shape (`creditCard.challenges`, `creditCard.supportedCardBrands`).
  - **Breaking:** Rename `threeDSecureEnabled` and `threeDSecure` configuration properties to `creditCard.threeDSecureEnabled` and `creditCard.threeDSecure`.
  - **Breaking:** Expose the `applePayWeb` configuration property in its native GraphQL shape
  - **Breaking:** Expose the `paypal` configuration property in its native GraphQL shape
- Data Collector
  - **Breaking:** Rename error `DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS` to `DATA_COLLECTOR_FAILED_TO_INSTANTIATE` to make error more explicit
- Dependencies
  - Update `@braintree/asset-loader` to 2.1.0
  - Update `@braintree/event-emitter` to 2.0.4
  - Update `@braintree/browser-detection` to 2.1.1
  - Update `@braintree/extended-promise` to 1.0.3
  - Update `@braintree/iframer` to 2.0.3
  - Update `card-validator` to 10.0.4
  - Update `credit-card-type` to 10.3.0
  - Update `inject-stylesheet` to 7.0.2
  - Update `restricted-input` to 4.2.0
  - Remove `@braintree/wrap-promise`
- PayPal Checkout (PPCPv5)
  - **Breaking:** Require `pageType` option when calling `loadPayPalSDK()`. It is sent as the `data-page-type` attribute on the PayPal SDK script and takes precedence over an equivalent value passed via `dataAttributes`.
  - **Breaking:** Default `intent` to `capture` instead of `authorize` in `loadPayPalSDK()` and `createPayment()` when not explicitly provided, matching the PayPal SDK's default. Pass `intent: 'authorize'` explicitly to keep the old behavior.
  - **Breaking:** Change `autoSetDataUserIdToken` option default to enabled. Pass `autoSetDataUserIdToken: false` to disable.
- Venmo
  - **Breaking:** Require `paymentMethodUsage` option to be present
  - **Breaking:** Require `totalAmount` option to be present when `paymentMethodUsage` is `single_use`
  - Desktop QR Code popup flow UI enhancements

### Removed

- General
  - **Breaking:** Remove callback function support. Use `async/await` or `Promise` instead.
  - Remove Internet Explorer 9 polyfills
- 3D Secure (3DS)
  - **Breaking:** Remove 3D Secure v1 support. Use 3D Secure v2 instead.
  - **Breaking:** Remove `2-bootstrap3-modal` option. Bootstrap modal support has been removed. See new `challengeDisplay` option for supported options.
  - **Breaking:** Remove `version` option. Component always uses 3D Secure v2. See new `challengeDisplay` option for how to control challenge display mechanism.
  - **Breaking:** Remove `THREEDS_UNSUPPORTED_VERSION` error code
  - **Breaking:** Remove deprecated `exemptionRequested` option from `verifyCard`. Use `requestedExemptionType` instead.
  - **Breaking:** Remove deprecated `cardAdd` option from `verifyCard`. Use `cardAddChallengeRequested` instead.
  - **Breaking:** Remove deprecated top-level `liabilityShifted` and `liabilityShiftPossible` properties from the `verifyCard` and `cancelVerifyCard` payloads. Use nested `payload.threeDSecureInfo.liabilityShifted` and `payload.threeDSecureInfo.liabilityShiftPossible` instead.
- Client
  - **Breaking:** Remove synthetic `paypalEnabled` configuration property
- Data Collector
  - **Breaking:** Remove deprecated `paypal` option. The option was a no-op.
  - **Breaking:** Remove deprecated `clientMetadataId` and `correlationId` options. Use `riskCorrelationId` instead.
- Google Pay
  - **Breaking:** Remove support for Google Pay API v1
- Hosted Fields
  - **Breaking:** Remove deprecated option `field.selector`. Use `field.container` instead.
  - **Breaking:** Remove deprecated function `setPlaceholder()`. Use `setAttribute({ field, attribute: "placeholder", value })` instead.
  - **Breaking:** Remove deprecated `field.rejectUnsupportedCards` option. Use `supportedCardBrands` instead.
- Masterpass
  - **Breaking:** Remove deprecated Masterpass component (`masterpass`)
- Payment Request
  - **Breaking:** Remove deprecated PaymentRequest component (`payment-request`)
- PayPal
  - **Breaking:** Remove deprecated PayPal component (`paypal`). Use `paypal-checkout-v6` instead.
- PayPal Checkout V6 (PPCPv6)
  - **Breaking:** Remove deprecated `isSupported()` function
- US Bank Account (ACH Direct Debit)
  - **Breaking:** Remove deprecated bank login flow
- Venmo
  - **Breaking:** Remove URL hash inspection for payment status. Payment status is now determined exclusively via the Payment Context API.
  - **Breaking:** Remove `VENMO_APP_CANCELED`, `VENMO_APP_FAILED`, and `VENMO_CANCELED` error codes. Use `VENMO_CUSTOMER_CANCELED` instead.
  - **Breaking:** Remove `@` prefix from Venmo `details.username` and `details.payerInfo.userName`
- Visa Checkout
  - **Breaking:** Remove deprecated Visa Checkout component (`visa-checkout`)

### Fixed

- Hosted Fields
  - Fix card validation string for Mastercard, from `master-card` to `mastercard`
