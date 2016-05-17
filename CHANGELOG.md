CHANGELOG
=========

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
