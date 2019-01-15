CHANGELOG
=========
## 3.42.0
* Update @braintree/sanitize-url to v3.0.0
* Hosted Fields
  * Fixes issue where inputs would not focus after initial touch event on iOS Safari (#405, thanks @lgodziejewski)
  * Allow `maxCardLength` in `number` field
  * Fix issue where UnionPay cards were not checked for luhn validity
* PayPal Checkout
  * When passing in `authorization` instead of a `client` in component creation, the client will be created in the background (improves loading time)
* Payment Request
  * Add canMakePayment method

## 3.41.0
* Add Local Payments component
* PayPal Checkout
  * Add support for `lineItems`
* Payment Request
  * Support Google Pay v2
  * Support PayPal in Google Pay

## 3.40.0
* Update framebus to v3.0.2
* 3D Secure
  * Allow creating component with an `authorization` instead of a `client`
* American Express
  * Allow creating component with an `authorization` instead of a `client`
* Apple Pay
  * Allow creating component with an `authorization` instead of a `client`
* Data Collector
  * Allow creating component with an `authorization` instead of a `client`
* Google Payment
  * Allow Google Pay Version 2 requests
  * Allow direct tokenization of PayPal accounts
  * Allow creating component with an `authorization` instead of a `client`
* Hosted Fields
  * Allow creating component with an `authorization` instead of a `client` (added in v3.38.1, documented in v3.40.0)
* Masterpass
  * Allow creating component with an `authorization` instead of a `client`
* Payment Request
  * Allow creating component with an `authorization` instead of a `client`
* PayPal
  * Allow creating component with an `authorization` instead of a `client`
* PayPal Checkout
  * Fix issue where `merchantAccountId` option could not be used when the default Merchant Account did not have PayPal enabled
  * Allow creating component with an `authorization` instead of a `client`
* UnionPay
  * Allow creating component with an `authorization` instead of a `client`
* US Bank Account
  * Allow creating component with an `authorization` instead of a `client`
* Vault Manager
  * Allow creating component with an `authorization` instead of a `client`
* Venmo
  * Fix issue where url may be overwritten when a hash is not present #394 (thanks @arettberg)
  * Add `deepLinkReturnUrl` to `venmo.create`
  * Allow creating component with an `authorization` instead of a `client`
* Visa Checkout
  * Allow creating component with an `authorization` instead of a `client`

## 3.39.0
* PayPal Checkout
  * Add `merchantAccountId` to PayPal `options`
* Update promise-polyfill to v8.1.0
* Use @braintree/class-list for manipulating classes
* Use @braintree/asset-loader for loading assets
* Client
  * Speed up client creation caching and prevent race conditions
* Hosted Fields
  * Fix issue where analytics in iframe could be out of sync with analytics on merchant page

## 3.38.1
* Update credit-card-type to v8.0.0
* Update card-validator to v6.0.0

## 3.38.0
* Hosted Fields
  * Only accepts Luhn valid UnionPay cards. Previously, non-Luhn valid card numbers were accepted even though they were not supported by Braintree
* Payment Request
  * Fix issue where npm browser builds could not load payment request (#388)

## 3.37.0
* Provide browser compatible files on npm for each component in `dist/browser/component-name.js` (#366)
* Update credit-card-type to v7.1.0
* Hosted Fields
  * Detect if `Mir` credit card is entered
  * Fix issue where Android text field would be selected when focused after inputting data (#379)
  * Fix error emitted by Chrome (in verbose logging mode) for not using a passive flag for `touchstart` event

## 3.36.0
* Update promise-polyfill to v8.0.0
* Provide browser compatible file on npm in `dist/browser` (#366)
* Google Pay
  * Preserve `allowedCardNetworks` from default configuration in `cardRequirements` if not overwritten in `createPaymentDataRequest`
* Hosted Fields
  * Add option to reveal last four of credit card number when masking input
  * Expose error when no field keys are passed into fields object (#355)

## 3.35.0
* Add title attribute to iframes to improve accessibility for screenreaders (#374)
* Vault Manager
  * Expose if fetched payment methods have an associated subscription

## 3.34.1
* Update credit-card-type to v7.0.0
* Update card-validator to v5.0.0
* Client
  * Fix client cache issue when using teardown
* Data Collector
  * Hide 1px Kount iframe
* Hosted Fields
  * Fix improper validation on iPad keyboards for expiration date field [#369](https://github.com/braintree/braintree-web/issues/369)
  * Fix issue where extra history events would be added in Chrome and Firefox
* Venmo
  * Add validation for profile ids (must be strings)

## 3.34.0
* Apple Pay
  * Fix issue with Apple Pay configuration [#365](https://github.com/braintree/braintree-web/issues/365)
* Hosted Fields
  * Include data about the containers for invalid fields in tokenization error (#359)
  * Fix issue where inputs would not mask in iOS
* 3D Secure
  * Fix issue where payment method details were not provided in the flow where an iframe is not needed
  * Fix issue where description in verify card payload was coming back with `+` symbols instead of spaces
  * Add binData property to verify card payload

## 3.33.0
* Internal performance optimizations
* Update framebus to v3.0.1
* Update credit-card-type to v6.3.0
* Hosted Fields
  * Allow passing in class name for style configuration (#361)
  * Fix issue where tokenization could not take place because the `window.length` variable had been overwritten
  * Fix regression where sending card numbers with - or spaces would result in cardType unknown in the payload (#241)
* Payment Request
  * Fix issue with changing shipping address and shipping options which could cause Chrome to crash

## 3.32.1
* Payment Request
  * Expose errors more gracefully
* Hosted Fields
  * Revert fix issue where Roboform could not autofill cards [#356](https://github.com/braintree/braintree-web/issues/356). It was causing an issue where the inputs would be hidden in Safari if their container was changed from `display: none` to `display: block`

## 3.32.0
* Venmo
  * Add support for Venmo profile IDs
* Google Pay is no longer in beta.
* Masterpass
  * Fix issue where error would not surface correctly for window being blocked by a popup blocker
* PayPal
  * Fix issue where error would not surface correctly for window being blocked by a popup blocker
* Hosted Fields
  * Fix issue where autocomplete properties were not applied (closes #353)
  * Ensure that focus state is maintained when focus is called programatically
  * Cards that cannot be processed by the merchant can invalidate Hosted Fields by adding a `fields.number.rejectUnsupportedCards` option to the object passed into Hosted Fields `create`. See documentation for adding this property.
  * Fix issue where Roboform could not autofill cards [#356](https://github.com/braintree/braintree-web/issues/356)
* PayPal Checkout
  * Fix error handling around not having a linked PayPal sandbox account
* 3D Secure
  * Add support for American Express SafeKey params

## 3.31.0
* Update credit-card-type to v6.2.0
* Update card-validator to v4.3.0
* Venmo
  * Add browser support detection helper as static method on `braintree.venmo.isBrowserSuppported`

## 3.30.0
* Update promise-polyfill to v7.0.2 (#350 thanks @Macavity)
  * Fixes issues with promises not working in IE from v3.28.0-v3.29.0
* Hosted Fields
  * Add `padding` to supported CSS attributes (#104)

## 3.29.0
* Update credit-card-type to v6.1.1
* Update jsdoc-template to v3.2.0
* Hosted Fields
  * Fix issue where some series 2 Mastercard bin ranges were not being detected (internal assets for v3.19.1 forward have this fix applied)

__BREAKING CHANGES__

* Google Pay - Beta
  * Switch from using iframe based solution to Google pay.js script tag solution
    * `braintree.googlePayment.isSupported` has been removed
    * `tokenize` and `createSupportedPaymentMethodsConfiguration` and `on` methods and has been removed. See documentation example for new integration pattern.

## 3.28.1
* Update @braintree/sanitize-url to v2.1.0

## 3.28.0
* Update promise-polyfill to v7.0.0
* American Express
  * Add missing `teardown` method
* Apple Pay
  * Add missing `teardown` method
* Client
  * Add missing `teardown` method
* Google Pay
  * References to Pay with Google have now been converted to Google Pay in accordance with Google's brand guidelines
* PayPal Checkout
  * Add missing `teardown` method
* Vault Manager
  * Add missing `teardown` method
* Venmo
  * Add missing `teardown` method
* Visa Checkout
  * Add missing `teardown` method

__BREAKING CHANGES__

* Google Pay - Beta
  * Error codes that included `PAY_WITH_GOOGLE` have been updated to `GOOGLE_PAYMENT`
    * PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE -> PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE
    * PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR -> PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR
* Payment Request - Beta
  * Change `payWithGoogle` property to `googlePay` property when instantiating a Payment Request component with `enabledPaymentMethods` option

## 3.27.0

* Update card-validator to v4.2.0
* Internal performance optimizations
* Prefer popup bridge before browser supporting popups in frame service (#341, thanks @night)
* Hosted Fields
  * Send back timeout error if Hosted Fields takes longer than 60 seconds to set up
  * Allow locality (the city) to be sent as part of billing address fields
  * Allow region (the state) to be sent as part of billing address fields
  * Allow cvv to have minlength be applied when using cvv only integration
* Masterpass
  * Throw MASTERPASS_POPUP_FAILED if required params returned by masterpass are missing
* Payment Request - Beta
  * Support `requestShipping` option
* Pay with Google - Beta
  * Support `requestShipping` option

## 3.26.0

* Hosted Fields
  * Correct bug where pasting in on an iOS device would mangle the input (https://github.com/braintree/restricted-input/pull/46)
  * Update credit-card-type to version 6.1.0 (accept JCB cards of length 17-19)

## 3.25.0

* Hosted Fields
  * Add `setMessage` for screenreader-compatible error messages
  * Fix issue where autofill would not work in selects with month values 1-9 (##331)
  * Allow fields to be prefilled with values
* Payment Request - Beta
  * Add `lastFour` to tokenize payload

## 3.24.1

* Update credit-card-type to v6.0.0
* Update card-validator to v4.1.1
* Hosted Fields
  * `niceType` for Mastercard will now render as `Mastercard` instead of `MasterCard` to match Mastercard's brand guidelines
* Pay with Google - Beta
  * Correct isSupported to only return true on Android Chrome v61 and higher

## 3.24.0

* 3D Secure
  * Error early in creation if a tokenization key is used for authorization
  * Add liablity shift info to top level of cancelVerifyCard payload
* Payment Request - Beta
  * Add billing address details to tokenization payload
* Pay with Google - Beta
  * Apply field to allow tokenization with tokenization key
  * Properly wrap Pay with Google so callbacks can be used

__BREAKING CHANGES__

* Payment Request and Pay with Google - Beta
  * Some non-essential fields from tokenize payload removed

## 3.23.0

* Add beta Pay with Google Component
* Add beta Payment Request Component
* Update sanitize-url to version 2.0.2
* Update restricted-input to version 1.2.6
* Data Collector
  * Update sjcl to 1.0.7
  * Provide raw device data object as `instance.rawDeviceData`
* Hosted Fields
  * Add `billingAddress.extendedAddress` as a tokenization option
  * Add `billingAddress.company` as a tokenization option
  * Add `billingAddress.firstName` as a tokenization option
  * Add `billingAddress.lastName` as a tokenization option
* 3D Secure
  * Allow opting out of bank frame loader
* Vault Manager
  * Provide bin data if present

## 3.22.2

* Update sanitize-url to version 2.0.0
* 3D Secure
  * Add `liabilityShifted` and `liabilityShiftPossible` to the top level when 3DS lookup fails to open a 3DS iframe.
* Hosted Fields
  * Fix issue where inputs would not mask correctly when autofilled
  * Update credit-card-type to version 5.0.4
  * Fix issue where placeholder would not load in IE9

## 3.22.1

* Security improvements
* Data Collector
  * Fix bug where Data Collector with Kount could not be torn down more than once (#314)

## 3.22.0

* Hosted Fields
  * Fix regression where postal code input would not display alpha numeric keyboard on iOS
  * Add bin data to tokenization payload
  * Add option for input masking

## 3.21.1

* Hosted Fields
  * Fix regression where iframes could not load on IE 9 and 10

## 3.21.0

* Hosted Fields
  * Fix issue where phone number keyboard would display on iOS devices
  * Allow passing `countryName`, `countryCodeAlpha2`, `countryCodeAlpha3`, and `countryCodeNumeric` under `billingAddress` as a tokenization option
  * Fix issue where Apple based browsers (Safari, iOS Chrome, iOS Firefox, etc) would add multiple history states when Hosted Fields loads

## 3.20.1

* Update browser-detection to v1.6.0
* Hosted Fields
  * Fix issue where field would not blur on iOS when tapping out of the Hosted Fields inputs
* PayPal
  * Fix issue in iOS Firefox where PayPal window would not open

## 3.20.0

* Client
  * Add request retries for TCP preconnect errors in Internet Explorer and Edge
* Hosted Fields
  * Update restricted-input to version 1.2.5
  * Fix bug where placeholder would be set to null after autocomplete fires if no placeholder was set
  * Allow passing `streetAddress` under `billingAddress` as a tokenization option
  * Fix issue where Hosted Fields would not load intermittently in Edge and IE11
  * Fix issue where Hosted Fields validity would not update after paste events (#308)

## 3.19.1

* Client
  * Cache client creation when using the same authorization
* Hosted Fields
  * Update credit-card-type to v5.0.3 to fix a bug where certain MasterCard bins were not being marked as potentially valid
* Inline JS in HTML frames

## 3.19.0

* Hosted Fields
  * Allow `cardholderName` to be passed while tokenizing the card
  * Fix bug disabling fields when enter is pressed

## 3.18.0

* Hosted Fields
  * Fix autofill issues for Chrome and Safari (#239)

## 3.17.0

* Hosted Fields
  * Add `minlength` to fields options to set the `minlength` of postal code inputs
  * Update credit-card-type dependency (UnionPay detection fixes)
  * Update restricted-input dependency to 1.2.1 (Browser Detection updates)
* PayPal
  * Frame fixes in iOS

## 3.16.0

* Client
  * Access version with `getVersion()`
* Hosted Fields
  * Fix bug where inputs would not load intermittently on old browsers (#233)
  * Typing `1/` in an expiration date field will now result in `01 / ` formatting (#221)
  * Fix bug where certain webviews would cause inputs to be untypable after tapping a second time (#207)
* Masterpass
  * Enable Masterpass as a payment option
* PayPal
  * Mark PayPal component as deprecated in favor of using PayPal Checkout

## 3.15.0

* Hosted Fields
  * Fix bug where expiration dates using select boxes would print an error when selected on mobile devices
  * Fix a bug where Android Webviews on KitKat could not enter more than 4 characters in inputs
  * Add supportsInputFormatting method to check if browser will support input formatting
* Data Collector
  * Cache and reuse device data when created multiple times with the same Kount merchant id
  * Fix issue where Kount data was not collected by additional Data Collector instances

## 3.14.0

* American Express
  * `americanExpress.create` returns a promise if no callback is provided
  * `americanExpress.getRewardsBalance` returns a promise if no callback is provided
  * `americanExpress.getExpressCheckoutProfile` returns a promise if no callback is provided
* Apple Pay
  * `applePay.create` returns a promise if no callback is provided
  * `applePay.performValidation` returns a promise if no callback is provided
  * `applePay.tokenize` returns a promise if no callback is provided
* Hosted Fields
  * `hostedFields.tokenize` returns a promise if no callback is provided
  * `hostedFields.addClass` returns a promise if no callback is provided
  * `hostedFields.removeClass` returns a promise if no callback is provided
  * `hostedFields.setAttribute` returns a promise if no callback is provided
  * `hostedFields.removeAttribute` returns a promise if no callback is provided
  * `hostedFields.setPlaceholder` returns a promise if no callback is provided
  * `hostedFields.clear` returns a promise if no callback is provided
  * `hostedFields.focus` returns a promise if no callback is provided
* PayPal
  * Add support for PayPal Credit in Vault flow
  * `paypal.create` returns a promise if no callback is provided
  * `paypal.tokenize` returns a promise if no callback is provided
  * `paypal.teardown` returns a promise if no callback is provided
  * `paypal.closeWindow` closes the PayPal window if open
  * `paypal.focusWindow` focuses the PayPal window if open
* PayPal Checkout
  * Add support for PayPal Credit in Vault flow
* 3D Secure
  * `threeDSecure.create` returns a promise if no callback is provided
  * `threeDSecure.verifyCard` returns a promise if no callback is provided
  * `threeDSecure.cancelVerifyCard` returns a promise if no callback is provided
  * `threeDSecure.teardown` returns a promise if no callback is provided
* Union Pay
  * `unionPay.create` returns a promise if no callback is provided
  * `unionPay.enroll` returns a promise if no callback is provided
  * `unionPay.fetchCapabilities` returns a promise if no callback is provided
  * `unionPay.teardown` returns a promise if no callback is provided
  * `unionPay.tokenize` returns a promise if no callback is provided
* Visa Checkout
  * `visaCheckout.create` returns a promise if no callback is provided
  * `visaCheckout.tokenize` returns a promise if no callback is provided

## 3.13.0

* Hosted Fields
  * Fix an issue where Firefox did not receive focus/blur events consistently when navigating fields via tab key
  * Provide specific errors for problems with tokenization
  * Add `focus` to allow programmatic focusing of inputs
  * Add `maxlength` to fields options to set the `maxlength` of CVV and postal code inputs. Use cases:
    * Limiting the length of the CVV input for CVV-only verifications when the card type is known
    * Limiting the length of the postal code input when cards are coming from a known region

## 3.12.1

* PayPal
  * Fix bug where PayPal did not detect when the Popup was closed by the customer

## 3.12.0

* Client
  * Fix a bug where `atob` was not being called with the window context
* Hosted Fields
  * Add support for `appearance` CSS rule
* PayPal
  * Fix support issues
* Visa Checkout
  * Add Visa Checkout component

## 3.11.1

* Client
  * Fix a bug where errors within the request callback function were being caught by the request promise instead of bubbling up
* PayPal Checkout
  * Allow tokenization keys to use the `vault` flow

## 3.11.0

* Hosted Fields
  * `hostedFields.create` now returns a promise if no callback is provided
  * `hostedFields.tokenize` now returns a promise if no callback is provided
* PayPal Checkout
  * Enable webview support
  * `intent` property is now passed in correctly
* Vault Manager
  * Create the Vault Manager component

## 3.10.0

* Client
  * Fix bug where creation errors did not bubble up correctly
* Data Collector
  * Fix bug where creation errors did not bubble up correctly
* Hosted Fields
  * Add `removeAttribute` to allow removal of certain input attributes
  * Add RTL language support
* PayPal
  * Add synchronous method to determine if PayPal supports the browser
* PayPal Checkout
  * Add synchronous method to determine if PayPal Checkout supports the browser
  * Fix bug that caused some errors to be uncatchable
  * Add `landingPageType` as a tokenization option
    * `login` - A PayPal account login landing page is used
    * `billing` - A non-PayPal account landing page is used
  * Provide error when PayPal Checkout can not be used because there is no linked PayPal Sandbox account

## 3.9.0

* Client
  * `client.request` now returns a promise if no callback is provided.
  * `client.create` now returns a promise if no callback is provided
* Data Collector
  * `dataCollector.create` now returns a promise if no callback is provided
  * `dataCollectorInstance.teardown` now returns a promise if no callback is provided
* Hosted Fields
  * Fix bug where some versions of IE could not render Hosted Fields inputs because of `window.top` being undefined
  * Fix autofill for 1Password extensions
  * Correct detection of Samsung browsers to disable input formatting in old versions
  * Allow passing `postalCode` as an option when the `postalCode` field is not enabled
* PayPal
  * Add `landingPageType` as a tokenization option
    * `login` - A PayPal account login landing page is used
    * `billing` - A non-PayPal account landing page is used
  * Add support for PopupBridge
* PayPal Checkout
  * Pass in correlation id from billing agreement token or ec token when tokenizing

## 3.8.0

* Pre-bundled files are now published to npm, fixing parsing errors when using webpack
* Hosted Fields
  * Fix a bug where Mobile Safari would not emit blur events consistently
  * Add support for new Visa card numbers with 18 or 19 digits
  * Add `setAttribute` to allow dynamic updating of input attributes
  * Validate `setPlaceholder` to accept only strings and numbers
* 3D Secure
  * HTTPS is no longer required for sandbox environments
* PayPal Checkout
  * Return PayPal Credit financing details when calling `tokenizePayment`
* American Express
  * Fix bug where arguments to `getRewardsBalance` were mutated
* PayPal
  * Call callback with BROWSER_NOT_SUPPORTED error when using Chrome for iOS v47 or lower

## 3.7.0

* Client
  * Fix issue where `getConfiguration` and `toJSON` were not returning the same object
* Hosted Fields
  * Fix a bug when placeholders aren't supplied for expiration month/year
  * Fix a bug where CVV field wouldn't validate all possible card type CVV lengths
  * Fix a bug where Samsung keyboards would incorrectly highlight the first character typed
  * Disable input formatting in the Android Samsung Internet browser
* PayPal
  * Return PayPal Credit financing details in `tokenizePayload.creditFinancingOffered`
* PayPal Checkout
  * Create the PayPal Checkout component to integrate with PayPal's [checkout.js library](https://github.com/paypal/paypal-checkout)

## 3.6.3

* Hosted Fields
  * Fix bug where Samsung Keyboards would format incorrectly in Android Chrome

## 3.6.2

* American Express
  * Fix bug where additional options were not passed along in getRewardsBalance request
* Hosted Fields
  * Fix a bug where unformatted inputs could not tokenize card numbers with hyphens or spaces
  * Fix a bug where postal codes of length 3 (e.g. in Iceland) were considered invalid
  * Fix input formatting with third party keyboards on Android Chrome

## 3.6.1

* Hosted Fields
  * Fix a bug where iOS Safari autocomplete would not print credit card number
* PayPal
  * Fix bug where the PayPal authorization flow began when the `flow` option was missing or invalid
* 3D Secure
  * Fix bug where failing `verifyCard` call put component in an inconsistent state

## 3.6.0

* Data Collector
  * Fix iframe styling in PayPal fraud tools
* Hosted Fields
  * Add support for `letter-spacing` CSS property
  * Fix a bug where Safari autocomplete would mangle credit card input
* PayPal
  * Return a `MERCHANT` error when `tokenize` is called outside of a user action event
  * Show loading indicator in popup when a successful authorization is being processed and tokenized

## 3.5.0

* Hosted Fields
  * Add dropdown support for expiration month and expiration year

## 3.4.0

* Client
  * More helpful error when a client token is generated with insufficient privileges
* Hosted Fields
  * Fix a bug where IE9 inputs would stutter when formatting
  * Enable input formatting on Android
* Apple Pay
  * Add support for Apple Pay integrations that are web-only
* UnionPay
  * Return a proper error when calling some functions without callbacks

## 3.3.0

* The `index.js` and `debug.js` files are now full `braintree-web` bundles and can be safely loaded in non-CommonJS environments
* Hosted Fields
  * Add input formatting to browsers on iOS
  * Maestro cards beginning with `6` are now correctly identified
* Data Collector
  * Use custom build of [SJCL](https://bitwiseshiftleft.github.io/sjcl/) to reduce file size

## 3.2.0

* Hosted Fields
  * Add `type` property for field configuration to allow things such as `type: "password"` for input masking of particular fields
  * For browsers that support it, the `month` input type can be used for `expirationDate`
  * Fix a bug where unformatted `expirationDate` inputs would fail validation if user typed in a space, hyphen or slash
* PayPal
  * Utility iframes are now annotated with the `braintree-dispatch-frame` class to assist with CSS targeting

## 3.1.0

* PayPal
  * Add focus handle to tokenize method
  * Move a utility iframe far out of view with `position: absolute`

__BREAKING CHANGES__
* Apple Pay
  * Fix a bug with tokenization parameters—no more workaround required

## 3.0.2

* Client
  * Provide better error messaging when actions that require a client token are attempted with a tokenization key
* Hosted Fields
  * Pass back client error when attempting to vault with an invalid authorization
* UnionPay
  * Pass back client error when attempting to vault with an invalid authorization
  * Remove vault option from tokenization
* Apple Pay
  * Add `merchantIdentifier` property for use with `ApplePaySession.canMakePaymentsWithActiveCard`
  * Fix a bug where `decoratePaymentRequest` (now called `createPaymentRequest`) failed to set `merchantCapabilities`. The default is now `['supports3DS']`, which is the most commonly used value.

__BREAKING CHANGES__
* Apple Pay
  * `decoratePaymentRequest` has been renamed to `createPaymentRequest`. This method returns a new object and does not mutate the argument
  * Return better error messages when Apple Pay merchant domain validation fails
  * The error code `APPLE_PAY_MERCHANT_VALIDATION` has been replaced with `APPLE_PAY_MERCHANT_VALIDATION_FAILED` and `APPLE_PAY_MERCHANT_VALIDATION_NETWORK`

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
