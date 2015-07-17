CHANGELOG
=========

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
