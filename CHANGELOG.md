CHANGELOG
=========

## 2.27.0

* Bugfix - Fixes an issue that prevented PayPal flows from working within the iOS Google Search app
* Hosted Fields
  * Support for MasterCard 2-series BIN ranges
* PayPal
  * A new option, `intent`, has been added.
  * Add PayPal Credit support

## 2.26.0

* PayPal
  * Bugfix - Remove styling that broke iOS UIWebViews
  * Adds support for `pt_BR` and `es_XC` locale codes

## 2.25.0

* Data Collector
  * Uses Kount configuration from the gateway if available

## 2.24.1

* PayPal
  * Adds support for additional currencies in Checkout with PayPal flow
    - `CZK`
    - `JPY`
    - `RUB`
* Hosted Fields
  * `postalCode` field now has a maximum length of 10 characters

## 2.24.0

* PayPal
  * Bugfixes for popup flows in iOS9 Chrome
  * Fixes recognition of Hong Kong and Swedish locales
* Drop-in
  * option `defaultFirst: true` added to list a customer's default payment method first

## 2.23.0

* PayPal
  * Bugfix - Change cancel button's `type` to `button` to keep it from "stealing" Enter keypresses (fixes [#150](https://github.com/braintree/braintree-web/issues/150))
* Drop-in
  * Call `onError` when server-side tokenization fails (fixes [#59](https://github.com/braintree/braintree-web/issues/59))

## 2.22.2

* PayPal
  * Bugfix - Fixes some scrolling issues with PayPal auth flow dialogs (fixes [#143](https://github.com/braintree/braintree-web/issues/143))
* DataCollector
  * Bugfix - Removes a non-critical error in IE8 (fixes [#141](https://github.com/braintree/braintree-web/issues/141))

## 2.22.1

* Fixes an issue that prevented `2.22.0` from being `require`-able when installing through `npm`

## 2.22.0

* PayPal
  * Adds support for additional currencies in Checkout with PayPal flow
    - `SGD`
    - `THB`
    - `PHP`
    - `NZD`
    - `HKD`
    - `MYR`

## 2.21.0

* PayPal
  * Add `billingAgreementDescription` for Checkout with PayPal flow
  * Update behavior of `shippingAddressOverride` in sandbox (fixes [#119](https://github.com/braintree/braintree-web/issues/119))
  * Bugfixes

## 2.20.0

* Hosted-Fields/Drop-in
  * Bump `card-validator` to `2.2.7`
* PayPal
  * Adds support for `MXN` and `ILS` currencies in Checkout with PayPal flow
  * Translation updates

## 2.19.0

* Drop-in
  * PayPal checkout button style changes
* PayPal
  * Add `onAuthorizationDismissed` callback to handle dismissal of the authorization flow

## 2.18.0

* Improve validation of tokenization keys
* Drop-in
  * Introduce PayPal checkout button option
* Hosted Fields
  * Support `-webkit-tap-highlight-color` and `-moz-tap-highlight-color` inner properties

## 2.17.6

* Bugfix - Reduce time to report error if there is an unhandled error (SSL, gateway unreachable, etc) with the JSONP driver
* Avoid exceptions caused by closed `window.opener`s in IE
* Hosted Fields
  * Bugfixes
    * `onFieldEvent` wasn't being called when `isEmpty` changed (fixes [#110](https://github.com/braintree/braintree-web/issues/110))
    * Teardown no longer injects empty `payment_method_nonce` input field
    * Field locking no longer occurs on iOS
    * 3-digit expiration month+date strings such as `2/20` are now valid
    * Space separated expiration dates such as `1 2020` are now valid
    * Potential validity of slashless expiration dates is now consistent
    * Expiration dates that are too long are no longer considered valid
    * CVV validation does not always validate 3-digit values as valid
* Drop-in
  * Bugfix - Fixes an error around deviceData being undefined (fixes [#114](https://github.com/braintree/braintree-web/issues/114))

## 2.17.5

* Fixes use of jQuery or DOM objects specifying containers or buttons

## 2.17.4

* Drop-in
  * Bugfix - Allow PayPal Vault flow to complete when no `paypal` options are given

## 2.17.3

* Drop-in
  * Bugfix - IE8 now correctly accepts DOM nodes as containers (fixes [#105](https://github.com/braintree/braintree-web/issues/105))
  * Bugfix - jQuery elements are properly accepted as containers (fixes [#105](https://github.com/braintree/braintree-web/issues/105))
  * Bugfix - PayPal popups now properly open when `paypal` options are not given

## 2.17.2

* Bugfixes

## 2.17.1

* Bugfixes

## 2.17.0

* Added support for tokenization keys
* Bugfix: Prevent unexpected mutation of configuration object passed to `.setup()`

## 2.16.1

* Bugfix: Fix [#98](https://github.com/braintree/braintree-web/issues/98)

## 2.16.0

* DataCollector
  * bundles BraintreeData functionality into v.zero integrations

## 2.15.4

* Drop-in
  * Bugfix: Properly complete card tokenization flow in IE8

## 2.15.3

* Deduped some internal dependencies for filesize reductions

* Hosted Fields
  * Fixes a bug where emptying a previously filled form would retain stale nonce
  * Bugfix: correctly report `card.type` in `onFieldEvent`

## 2.15.2

* PayPal
  * Fix a regression where `onCancelled` was no longer called

## 2.15.1

* Custom & Coinbase
  * Bugfixes

## 2.15.0

* Hosted Fields
  * Allow CVV-only integrations
  * Contextually validate month based on current date when using split fields

* PayPal
  * Introduce `headless` merchant configuration option
  * Introduce programmatic initialization and closing of PayPal auth flow
  * Increase localization coverage

* Coinbase
  * Fix regression where button appeared in unsupported browsers

## 2.14.4

* Drop-in
  * Fix spriting over text for Coinbase button

## 2.14.3

* Improve formatting of error handler if you don't specify an `onError` callback

* Fix [an issue](https://github.com/braintree/braintree-web/issues/74) when handling credit card fields

* Coinbase
  * Update popup size to reflect new Coinbase design

* PayPal
  * BugFixes

## 2.14.2

 * PayPal
    * Bugfixes

## 2.14.1

* PayPal
  * Bugfixes

## 2.14.0

* Introduce `hosted-fields`
* Bugfixes

## 2.13.0

* Introduce `teardown`

* PayPal
  * Bugfixes

## 2.12.2

  * PayPal
    * Bugfixes

## 2.12.1

  * Api
    * Timeout optimizations

## 2.12.0
  * Adds new features for partners

## 2.11.4
  * PayPal
    * Bugfixes

## 2.11.3
  * Bugfixes


  * PayPal
    * Adds indicator to app if mock data is being used
    * onUnsupported errors console.log by default

## 2.11.2
 * Bugfixes

## 2.11.1
 * iframe messaging bug fixes

## 2.11.0
 * Add `enableCORS` as configuration option

## 2.10.1
  * Coinbase
    * Fixes a bug where the authorization popup did not close after clicking "Deny"

## 2.10.0
  * Use CORS in favor of JSONP

  * Drop-in
    * Bugfixes

  * PayPal
    * Fixes a bug with the footer not persisting across views

## 2.9.0
  * Drop-in
    * Contextually validate month based on current date
    * Bugfix for Chrome auto-fill issue

## 2.8.1
  * PayPal
    * Bugfixes

## 2.8.0
  * Drop-in
    * Report client-side validation failures to `onError`
    * Add support for valid cards over 16 digits (including Maestro)
    * Fix missing background on error overlay in Internet Explorer 8

  * PayPal
    * Bugfixes

## 2.7.4
  * Bugfixes

  * Drop-in
    * Generate new nonce on each submit attempt when new payment method is available

  * Coinbase
    * Bugfixes related to popup logins not working in some Metro versions of IE

  * PayPal
    * Add billing address retrieval via `enableBillingAddress` client option

## 2.7.3
  * PayPal
    * Render errors for failed two-factor auth logins
    * Add modal support in webviews on iOS

## 2.7.2
  * Drop-in
    * Refactor expiration validation to max out at 19 years in the future

## 2.7.1
  * Custom
    * Ensures that nonces are written to the DOM immediately after they are generated

## 2.7.0
  * Add `onReady` callback
  * Custom
    * Credit card form is no longer required
  * Drop-in
    * Ensure only whitelisted payment methods are displayed (Credit cards, PayPal, Coinbase)
    * Fix Safari autofill issue
  * Coinbase
    * Add iOS8/Lollipop completion page when popup cannot close
    * Do not render button in ie8

## 2.6.3
  * Bugfixes

## 2.6.2
  * Bugfixes

## 2.6.1
  * Coinbase
    * Prevent rendering Authorization state when user denies auth flow or closes popup

## 2.6.0
  * 3D Secure
    * Add an `onUserClose` callback
    * Fix modal repaint issues during orientation changes
    * Minor style updates

## 2.5.5
  * Prevent Coinbase authorization from invoking callback in custom integration before form submit

## 2.5.4
  * PayPal
    * Call `onUnsupported` callback when an invalid country is provided to the checkout flow

## 2.5.3
  * Drop-in
    * Restrict input formatting to certain devices
      * Blacklists Android < 4.4
      * Blacklists Firefox on Android

## 2.5.2
  * Bugfixes

## 2.5.1
  * Bugfixes

## 2.5.0
  * Adds Coinbase
  * Introduce unified callback `onPaymentMethodReceived` and `onError` across all integrations

## 2.4.1
  * Drop-in
    * Add ability to autofill card form and format input values on paste
    * Provide names to generated iframes

## 2.4.0
  * Adds 3D Secure
  * Fix bug where JSONP callbacks were colliding

## 2.3.3
  * Expose `shippingAddress` in PayPal `onSuccess` callback

## 2.3.2
  * Bugfixes

## 2.3.1
  * Bugfixes

## 2.3.0
  * Custom Integrations
    * Accepts `onPaymentMethodReceived` callback in top-level configuration
  * Drop-in
    * Fix input styling issues on Firefox for Android
  * PayPal
    * Application re-skin
    * Accepts a `{boolean} enableShippingAddress` field in the options configuration
    * Displays your account shipping address details (Future payment flow only)
    * Additional locale translations added

## 2.2.4
  * Drop-in
    * Bugfixes
    * Remove PayPal monogram from PayPal button

## 2.2.3
  * Drop-in
    * Bugfixes
    * Remove PayPal monogram from PayPal button
