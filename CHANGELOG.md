CHANGELOG
=========

## 2.17.1

* Bugfixes

## 2.17.0

* Added support for tokenization keys
* Bugfix: Prevent unexpected mutation of manipulate configuration object passed to `.setup()`

## 2.16.1

* Bugfix: Fix [#98](https://github.com/braintree/braintree-web/issues/98)

## 2.16.0

* DataCollector
  * bundles BraintreeData functionality into v.zero integrations

## 2.15.4

* Dropin
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

* Dropin
  * Fix spriting over text for coinbase button

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
