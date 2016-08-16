CHANGELOG
=========

## 3.0.1

* PayPal
  * Fix a bug where vault flows that used a tokenization key could not tokenize

## 3.0.0

* Add prefix to `BraintreeError` codes to prevent namespace collisions
* PayPal
  * Return a `PAYPAL_POPUP_CLOSED` error code when the customer closes the popup
  * Return a `PAYPAL_INVALID_PAYMENT_OPTION` error code when PayPal options are invalid
  * Fix a bug where some locale codes were not accepted
  * Fix bug where JPY could not be used as PayPal currency
  * vault flows will automatically vault PayPal accounts if client token was generated with a customer id
* Hosted Fields
  * Automatic input formatting disabled for iOS and Android
* Apple Pay
  * Use error codes
* Some wrapped errors were inconsistently placed under the `err.details` property; they are now under `err.details.originalError`
* Client
  * Errors are now always instances of BraintreeError
* UnionPay
  * Add `vault` as an option to `tokenize` which allows cards to be vaulted on tokenization

## 3.0.0-beta.12

* Some error messages have been changed to be more consistent across components
* Update `BraintreeError` to include a `code`, which can be used to check for specific errors:

   ```
   hostedFieldsInstance.tokenize(function (err, payload) {
     if (err && err.code === 'FIELDS_EMPTY') {
       // Handle user input error
     }
   });
   ```

* Fix an incorrect `<script>` tag example in API docs
* Fix an error in Require.js API docs
* Hosted Fields
  * Automatic input formatting disabled for Android Firefox
  * Add `vault` as an option to `tokenize` which allows cards to be vaulted on tokenization
  * Add `addClass` and `removeClass` for updating classes on fields
  * Stop applying `invalid` CSS classes to `potentiallyValid` fields on tokenization attempts
* PayPal
  * Consistently return `BraintreeError` objects when the PayPal flow is cancelled
  * Return error during `create` when using a webview
* UnionPay
  * Add `type` to tokenize payload
* Add Apple Pay component.

## 3.0.0-beta.11

* Update create error messages to be more consistent
* Add `type` to Hosted Fields and PayPal tokenize payloads
* Hosted Fields
  * Add `getState` method that returns the state of all fields and possible card types
  * Fixes a regression where expiration dates with a past month within the current year were treated as valid
* PayPal
  * Add `useraction` option to `paypal.tokenize`

__BREAKING CHANGES__
* UnionPay improvements.
  * Card capabilities
    * Renamed `isUnionPayEnrollmentRequired` to `isSupported`.
    * When `isSupported` is false, Braintree cannot process UnionPay card. Customer would need to use a different card.
  * Enrollment response has `smsCodeRequired` flag.
    * If `true`, customer will receive an SMS code, that is required for tokenization.
    * If `false`, SMS code should not be passed during tokenization. Tokenization can be done immediately.

## 3.0.0-beta.10

* Return a human readable error message when requests are rate-limited.
* Add 3D Secure component.
* Hosted Fields
  * Throw an error when initializing with an invalid field key. See __BREAKING CHANGES__.
  * The formatting for expiration dates no longer inserts a leading `0` if the date begins with `1`. This prevents the numbers from jumping around for dates beginning `01`, `10`, `11`, or `12`.

__BREAKING CHANGES__
* An error is now returned when initializing Hosted Fields with an invalid field; it is no longer silently ignored.

## 3.0.0-beta.9

* No longer throws exceptions when using `require('braintree-web')` during server-side rendering with libraries such as React.js.
* `index.js` and `debug.js` in the npm/bower modules no longer reference `package.json`.
* Ajax errors in IE9 now report as general error instead of an empty string. It is impossible to get details additional about network errors in IE9 XDomainRequests.
* Add 3D Secure component
* UnionPay
  * Expiration date or month/year together are now optional as some UnionPay cards do not have expiration dates.
* PayPal
  * All `create` options aside from `client` have now moved to `tokenize`. See __BREAKING CHANGES__.
  * For one-time checkout, add `intent` option which can be `sale` or `authorize`
  * HTTPS is no longer required
  * Add `offerCredit` as an option to `tokenize` for offering customers PayPal Credit as a form of payment

__BREAKING CHANGES__
* PayPal's `create` options have moved to `tokenize`. Deferring these options to tokenization time allows greater flexibility in your checkout experience.

   ```
   braintree.paypal.create({
     client: clientInstance
   }, function (err, paypalInstance) {
     paypalInstance.tokenize({
       flow: 'checkout',
       amount: '10.00',
       currency: 'USD'
     }, function (tokenizeErr, payload) {
       // ...
     });
   });
   ```

## 3.0.0-beta.8

* Hosted Fields
  * Update `card-validator` to `2.2.8`
  * Throw a proper error when creating without a callback
* UnionPay
  * Fix tokenization bugs
* Data Collector
  * Throw a proper error when creating without a callback
* Improved error messaging when two components' versions do not match one another.

__BREAKING CHANGES__
* Data Collector
  * The `create` API has changed. `options.kount` for `dataCollector.create` is now a simple boolean:

    ```
    dataCollector.create({
      client: clientInstance,
      kount: true,
      paypal: true
    }, function (err, collector) {});
    ```

## 3.0.0-beta.7

* Hosted Fields
  * Add `inputSubmitRequest` event which is called when the user presses the Enter key (or equivalent) in a Hosted Fields input.

__BREAKING CHANGES__
* Make all callbacks consistently called asynchronously
* Hosted Fields
  * The `fieldStateChange` event is now 4 events: `empty`, `notEmpty`, `validityChange`, and `cardTypeChange`
  * Change event payloads to always return the full state of the form and all possible card types
* Data Collector
  * A `client` option is now required

## 3.0.0-beta.6

* Hosted Fields
  * `postalCode` field now has a maximum length of 10 characters
  * Fix issues when pasting into fields
* UnionPay
  * Added support for UnionPay and Hosted Fields
  * Updated the API
  * Added `teardown` to cleanly destroy a UnionPay instance
* PayPal
  * Add support for `billingAgreementDescription`

__BREAKING CHANGES__
* UnionPay
  * `fetchCapabilities` now takes `card: {number: '4111'}` instead of `cardNumber: '4111'`
  * `enroll` now takes mobile phone data under the `mobile` property instead of the `card` property
  * `enroll` now returns a property called `enrollmentId` instead of `unionpayEnrollmentId`
  * Removed the `options.options` property from `tokenize`; `smsCode` and `enrollmentId` are now top-level options

## 3.0.0-beta.5

* Improve documentation of callbacks
* Hosted Fields
  * Calling methods (such as `tokenize` or `setPlaceholder`) after Hosted Fields has been torn down throws an error
* PayPal
  * Calling methods (such as `tokenize`) after PayPal has been torn down throws an error
* DataCollector
  * Throw an error when trying to tear down twice
* American Express
  * `getRewardsBalance` to get the rewards balance of a Braintree nonce
  * `getExpressCheckoutProfile` to get the Express Checkout profile of an Amex nonce
* UnionPay
  * `fetchCapabilities` to fetch card capabilities, and determine if a card requires enrollment
  * `enroll` to process enrollment for a card
  * `tokenize` UnionPay cards

## 3.0.0-beta.4

* Client
  * `client` components no longer have a `teardown` function
* Hosted Fields
  * Add `setPlaceholder` to allow dynamic updating of field placeholders
  * Client component version must match Hosted Fields' component version
  * Throw `BraintreeError` if tokenize does not include a callback
* PayPal
  * Bugfixes in teardown
  * Client component version must match PayPal's component version
  * Make teardown callback optional
  * Throw `BraintreeError` if tokenize does not include a callback

## 3.0.0-beta.3

* npm packaging fixes

## 3.0.0-beta.2

* Hosted Fields
  * Allow expiration dates with leading zeroes when formatting is enabled
* PayPal
  * Bugfixes

__BREAKING CHANGES__
* PayPal
  * Replace `shippingAddressOverride.editable` with `shippingAddressEditable`, which disables user editing of shipping address when set to false.
  * Replace `singleUse` boolean property with `flow` string property. `singleUse: true` is now `flow: 'checkout'`. `flow` is required; use `flow: 'vault'` for Vault flow.

| Old | New |
| --- | --- |
| `singleUse` omitted | `flow: 'vault'` |
| `singleUse: false` | `flow: 'vault'` |
| `singleUse: true` | `flow: 'checkout'` |

## 3.0.0-beta.1

This release contains a number of new features for developers and their users, the key benefits are listed below. This is a significant departure from our earlier versions of the JS SDK. It is a composable SDK instead of a collection of pre-defined integration patterns (better for more advanced developers):

* Smaller File Size

  > Results in faster load times and improves performance of their web applications. A merchant has the choice to control the size by controlling the components they use. To illustrate the implications of this: a merchant who is only using PayPal does not need to include (and subsequently force their users to download) the code for Hosted Fields, DataCollector, etc. if they are not leveraging these features.

* Modular Architecture for Advanced Developers

  > Rebuilt with a module-first approach. Developers have the choice and control over the specific JS SDK components they’d like to use instead of using the full SDK. The value of this is that it results in a simpler integration and also has been something many advanced developers have requested.

* Custom PayPal Button

  > Developers have the option to customize the PayPal button that is displayed on their page. We provide only a bindable programmatic handler.

* Hosted Fields Formatting

  > Many developers who use Hosted Fields have asked us for more robust abilities to format input into the Hosted Fields Form Fields for UX reasons. The new SDK allows fields to be formatted. One example of this is clean spacing between card numbers (4111 1111 1111 1111 instead of 4111111111111111).

* No Dependency on Form Submissions

  > Traditionally, our SDK has required developers to submit payment information in the context of a form. We no longer require developers to integrate with this pattern. Modern web applications tend to be built with richer client-side functionality (validation, multiple payment options, AJAX submission, etc.). Deferring the mechanics of tokenization to a simple API call in our SDK allows our libraries to be much less intrusive as far as developer experience goes.

* CORS Support, as opposed to JSONP

  > CORS is a Web Security technology that allows developers tight control over which third party services can be rendered within their web page. This is now the default.

* Improved .NET Experience

  > .NET developers who use the WebForms Technology have run into many issues with previous versions of our SDK related to competing form submission handling. Since we no longer rely on form submissions, native .NET form handling is left untouched.

* Improved Documentation

  > By its very nature, this new release is more low-level and less opinionated about contextual integration. This means we can provide an API reference and simpler getting started guides.

* Modern distribution

  > By focusing on npm and GitHub as release channels the SDK fits better with newer build pipelines and tooling.

* Improved error messaging

  > Better error handling and presentation everywhere, with clearer error messaging.
