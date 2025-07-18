# CHANGELOG

## 3.124.0 (2025-07-17)

- PayPalCheckout
  - Add support for `userAction` in vault flow
- Update dependencies
  - Update eslint-config-braintree to 7.0.0
  - Update eslint to 9.30.1

## 3.123.2 (2025-07-01)

- Update dependencies:
  - Update card-validator to 10.0.3

## 3.123.1 (2025-06-24)

- Apple Pay
  - Adding support for `domainName` to be inferred from the parent location when inside of an iframe

## 3.123.0 (2025-06-18)

- PayPal Checkout
  - Add support for RBA metadata for checkout flows
- 3D Secure
  - Update documentation for giftCardCurrencyCode

## 3.122.0 (2025-06-16)

- PayPal Checkout
  - Fixed issue with `setup_billing_agreement` allowing extra parameters to be passed in
- Venmo
  - Adding fix for the Venmo component when it was rendering inside of an iframe inside of a webview
  - Adding additional code path for the Venmo component for handling if the device is iOS, not in an iframe, and the native Venmo app isn't installed
  - Major refactoring of the appSwitch function

## 3.121.0 (2025-06-12)

- PayPal Checkout
  - Update JS Reference Docs for RBA Metadata to include `planType` in code example
- 3D Secure
  - Retrieve Cardinal songbird script URL and integrity hash from the gateway configuration

## 3.120.2 (2025-05-29)

- LocalPayment
  - Fix onPaymentStart not correctly handling asynchronous functions

## 3.120.1 (2025-05-28)

- PayPal Checkout
  - limit user action support to `flow=checkout`
- Venmo
  - Fix analytics calls to use correct function

## 3.120.0 (2025-05-22)

- PayPal Checkout
  - add PayPal AppSwitch support

## 3.119.0 (2025-05-19)

- PayPal Checkout
  - add support for userAction param for `createPayment`
  - new field `totalAmount` in `createPayment` for RBA Metadata

## 3.118.2 (2025-04-25)

- Local Payment Methods
  - Fix to make `paymentId` available before full page redirect

## 3.118.1 (2025-04-17)

- Venmo
  - Fix behavior for Android Chrome on `mobileWebFallback`

## 3.118.0 (2025-04-15)

- Fastlane
  - add `tokensOnDemand` to GQL
  - add `tokenExchange` to GQL
- PayPal Checkout
  - Add `contactPreference` to PayPal Checkout schema for Contact Module
- Return commercial data from `binData` in credit card response
  - New commercial boolean metadata fields: `business`, `consumer`, `purchase`, `corporate`

## 3.117.1 (2025-03-25)

- Venmo
  - fix to set `cspNonce` if `allowDeskopWebLogin` is enabled

## 3.117.0 (2025-03-24)

- Venmo
  - Add missing analytics events for Popup Bridge
  - Add `styleCspNonce` option to provide nonce to whitelist injected style in content support policy.
- Fraudnet
  - Add new option `cb1` to `dataCollector.create()` to allow specifying a callback name that will be invoked when fraudnet has finished initializing.

## 3.116.3 (2025-03-14)

- PayPal Checkout
  - Adding public documentation for riskCorrelationId in createPayment

## 3.116.2 (2025-03-11)

- Fastlane
  - Previous fix for a bug that occured when `termsAndConditionsCountry` was not available for tokenization did not cover all edge cases

## 3.116.1 (2025-03-11)

- Fastlane
  - Fix bug that occured when `termsAndConditionsCountry` was not available for tokenization

## 3.116.0 (2025-03-06)

- Fastlane
  - add `termsAndConditionsCountry` in tokenization
- 3D Secure
  - Remove Legacy framework as v1 has been deprecated completely
- Analytics
  - Changed Popup Bridge analytics to standardize around all Braintree SDKs

## 3.115.2 (2025-02-13)

- Apple Pay
  - Add `isDeviceToken` to `TokenizePayload`

## 3.115.1 (2025-02-10)

- Update restricted-input to v4.0.3
- Update dependencies
  - UglifyJS to 3.19.3
- Update browserify task
  - Setting UglifyJS `arrows` option to `false`

## 3.115.0 (2025-01-23)

- Docs update
  - Add `internationalPhone` option to `shippingAddressOverride` in PayPal Checkout JSDoc
- Update dependencies
  - framebus to v6.0.3
- Local Payment Methods
  - Allow redirect flow to work when inside an iframe

## 3.114.0 (2025-01-21)

- PayPal Checkout
  - Add `recipientEmail` option to `shippingAddressOverride`
- Update dependencies
  - @braintree/asset-loader to v2.0.2
  - @braintree/browser-detection to v2.0.2
  - @braintree/iframer to v2.0.1
  - @braintree/uuid to v1.0.1
  - card-validator to v10.0.2
  - credit-card-type to v10.0.2
  - framebus to v6.0.2
  - inject-stylesheet to v6.0.2
- PayPal Checkout
  - Add support for `shippingCallbackUrl` in `createPayment
- Data Collector
  - Deprecate Kount

## 3.113.0 (2024-12-17)

- Local Payment Methods
  - Fix hasTokenizationParams to account for token URL param
- Hosted Fields
  - add support for `-webkit-text-fill-color` CSS rule

## 3.112.1 (2024-11-19)

- Venmo
  - Fix a bug where, after redirecting in the mobile web flow, we were passing in a null context ID to a graphql API call. The fix is to set the Venmo instance's venmoPaymentContextId based on resource_id in url.

## 3.112.0 (2024-11-07)

- Local Payment
  - Remove support of `bic` field for iDeal payments
  - Update documentation for redirectUrl
- Utility Functions
  - Ensure camelCaseToSnakeCase handles null values correctly

## 3.111.1 (2024-10-31)

- Node.js
  - Updated from Node.js v14 to Node.js v20

## 3.111.0 (2024-10-23)

- Local Payment Methods
  - Add Full Page Redirect

## 3.110.0 (2024-10-15)

- SEPA
  - Add support for new full page redirect flow

## 3.109.0 (2024-09-24)

- PayPal Checkout
  - Add `userAuthenticationEmail` to `createPayment` to enable MPE

## 3.108.0 (2024-09-19)

- PayPal
  - Support Checkout with Vault on v2 orders API

## 3.107.1 (2024-09-11)

- Hosted Fields
  - Fix passing through a sessionId value

## 3.107.0 (2024-09-06)

- Hosted Fields
  - Add support for passing through a sessionId value
- PayPal Checkout
  - Enable option to pass through client-metadata-id
- Fastlane
  - Add support for loading the Fastlane component in an AMD environment
- Local Payment
  - Added Support for Local Payment `mbway` and `bancomatpay`

## 3.106.0 (2024-08-06)

- Fraudnet
  - Truncate session id to 32 characters.

## 3.105.0 (2024-07-30)

- PayPal Checkout
  - Add client-metadata-id as a data attribute when loading the PayPal SDK
- Google Pay
  - Add string conversion for totalPrice

## 3.104.0 (2024-07-24)

- Fastlane
  - Add support for Fastlane.
- DataCollector
  - Correlation ID now defaults to match Client Session ID if no Correlation ID is passed when creating DataCollector.

## 3.103.0 (2024-07-11)

- Package updates:
  - Updates @braintree/asset-loader to v2.0.1
  - Updates @braintree/browser-detection to v2.0.1
  - Updates @braintree/extended-promise to v1.0.0
  - Updates @braintree/iframer to v2.0.0
  - Updates @braintree/sanitize-url to v7.0.4
  - Updates card-validator to v10.0.0
  - Updates credit-card-type to v10.0.1
  - Updates framebus to v6.0.0
  - Updates inject-stylesheet to v6.0.1
- ThreeDS
  - Update base `verifyCard` to accept amount = 0

## 3.102.0 (2024-05-02)

- PayPal
  - Support new `amountBreakdown` and its subfields in the `updatePayment` method

## 3.101.3 (2024-04-18)

- FrameService
  - Updated to limit messages sent between popup and iframe from the window parent.

## 3.101.2 (2024-04-11)

- Venmo
  - Fix issue introduced in previous patch that would sometimes cause the Venmo flow to crash

## 3.101.1 (2024-04-04)

- Venmo
  - Fix issue where the Venmo Desktop flow would sometimes report as a mobile web transaction

## 3.101.0 (2024-03-19)

- Venmo
  - Add support for `isFinalAmount` flag to Venmo create
- Package updates
  - Updated @braintree/sanitize-url to 7.0.1

## 3.100.0 (2024-02-06)

- 3D Secure
  - Remove call to V1 modal as 3DS v1 is unsupported
- Local Payment
  - Add support for recurrent local payment

## 3.99.2 (2024-01-26)

- Venmo
  - Fix race condition in previous bug fix.

## 3.99.1 (2024-01-26)

- Venmo
  - Fix bug where the Venmo Desktop Popup would sometimes return a tokenization error when a customer canceled within the modal.
- Package updates
  - Replace `tomashanacek/gulp-envify` with `ladjs/gulp-envify` due to missing dependency (`tomashanacek/loose-envify`).

## 3.99.0 (2024-01-08)

- Venmo
  - Update `isBrowserSupported` to return true for iOS Chrome when `allowNewBrowserTab` is true and Venmo is not presented in an iFrame.

## 3.98.0 (2023-12-12)

- Local Payment
  - Add support for seamless/oneclick BLIK local payment

## 3.97.4 (2023-12-05)

- Venmo
  - Change overlay container to be on top of other page components and prevent click-through.

## 3.97.3 (2023-10-17)

- JS Docs
  - Venmo
    - Add clarification to `isBrowserSupported` for iOS Chrome.

## 3.97.2 (2023-09-20)

- JS Docs
  - PayPal
    - Add clarification to `updatePayment` options
  - Apple Pay
    - Updated `displayName` docs for `performValidation` to indicate that maximium length is 64 characters

## 3.97.1 (2023-08-17)

- JS docs
  - Add more details about content security policy
- Hosted Fields
  - Fix bug where keyboard navigation would sometimes not work in FireFox

## 3.97.0 (2023-08-08)

- 3D Secure
  - Updated documentation for `requestVisaDAF` parameter on `verifyCard`
- SEPA
  - Add support for new mandate params, `locale` and `billingAddress`
- PayPal
  - Remove PayPal private url and user agreement url from PayPal configuration response as deprecated
- Venmo
  - Change overlay container to `position: fixed` to cover the entire viewport.
- Package updates
  - Updated @braintree/sanitize-url to 6.0.4
  - Updated @braintree/browser-detection to 1.17.1

## 3.96.1 (2023-07-20)

- Venmo
  - Fix bug that does not receive the right `enrichedCustomerDataEnabled` flag

## 3.96.0 (2023-07-06)

- Update framebus to v5.2.1
- Hosted Fields
  - Remove `inputmode="numerical"` attribute from the postal code input so the alphanumerical keyboard is presented on iOS devices.
- 3D Secure
  - Add `requestVisaDAF` option to `verifyCard`
  - Add `customFields` param to `verifyCard`
- PayPal
  - Add support for v2/orders

## 3.95.0 (2023-06-27)

- 3D Secure
  - Add `merchantName` option to `verifyCard`
- Venmo
  - Fix `isBrowserSupported` for Venmo web desktop login
- Venmo
  - Add `collectCustomerBillingAddress`, `collectCustomerShippingAddress`,
    `totalAmount`, `subTotalAmount`, `discountAmount`, `taxAmount`, `shippingAmount`,
    and `lineItems` params to `createVenmoPaymentContext` for rendering in Venmo paysheet

## 3.94.0 (2023-05-09)

- 3D Secure
  - Adds `collectDeviceData` opt-in flag for 3DS lookups

## 3.93.0 (2023-05-04)

- Updated documentation in regards to 3D secure and CSP recommendations
- Local Payment
  - Add support for Pay Upon Invoice local payment type: `pay_upon_invoice`

## 3.92.2 (2023-04-24)

- Remove dependency on `promise-polyfill`
- Drop depenency on `@braintree/class-list`
- Drop specific behavior for Internet Explorer (IE)
  - Drop handling extra async setting of Hosted Fields iframe src
  - Remove special handling for IE9 keyup event in Hosted Fields
  - Drop dependencies on code for checking for IE useragents
  - Drop specific Frame Service IE open bug handling
- Client/All Components
  - Drop support for requests on Internet Explorer 9 over the http protocol
- Package updates
  - Moved cached-path-relative to devDependencies
  - Moved decode-uri-component to devDependencies
  - Moved json5 to devDependencies
  - Moved minimist to devDependencies
  - Moved terser to devDependencies

## 3.92.1 (2023-03-30)

- Hosted Fields
  - Fixed bug related to cardholderName having wrong inputmode

- Package updates
  - Updated @braintree/sanitize-url to 6.0.2
  - Updated json5 to 2.2.3
  - Updated decode-uri-component to 0.2.2
  - Updated terser to 4.8.1
  - Updated minimist to 1.2.8
  - Updated cached-path-relative to 1.1.0

## 3.92.0 (2023-03-09)

- Venmo
  - Fix issue resulting in blocked popups in desktop web login flow
- PayPal
  - Remove `amount` calculation in `updatePayment`; now `amount` param is required.
- 3D Secure
  - Clarify format of IP Address in `AdditionalInformation` object

## 3.91.0 (2023-02-22)

- 3D Secure
  - Add `requestedExemptionType` option to `verifyCard`
  - Deprecate `exemptionRequested` option in `verifyCard`
  - Made `verifyCard` BIN param required
  - Add error on use of v1
- Hosted Fields
  - Improved accessibility for screen readers

## 3.90.0 (2023-01-18)

- Paypal
  - Add support for `updatePayment`

## 3.88.6 (2022-12-15)

- Venmo
  - Fix Desktop Web Login flow running from an iframe

## 3.88.5 (2022-12-07)

- Venmo
  - Update constants to use correct deeplinking url for Venmo

## 3.88.4 (2022-11-08)

- 3D Secure
  - Update the regex to validate cardinal commerce domain
- Venmo Desktop
  - Use latest framebus for more secure messaging

## 3.88.3 (2022-11-03)

- Update framebus to v5.2.0
- Hosted Fields
  - Improve iframe communication with parent page

## 3.88.2 (2022-10-27)

- Sepa: fix jsdoc entry for `tokenize`
- 3D Secure: update jsdoc entry for `teardown`
- Client
  - Validate graphQL url when instantiating in an iframe/popup
- Hosted Fields
  - Patch `binAvailable` to only send bind detals to parent page
- Local payments
  - Fix canceled or failed flow for PopupBridge use cases

## 3.88.1 (2022-09-12)

- Venmo:
  - fix cases where nonce payload data was missing after tokenization

## 3.88.0 (2022-09-07)

- Venmo
  - add `allowAndroidRecreation` for addressing Android PopupBridge use cases
  - Update terminology around desktop web login
- 3D Secure
  - Add check to verify acsUrl if not a cardinal commerce domain

## 3.87.0 (2022-08-26)

- Venmo fix mobileWebFallback url reference
- Add support for SEPA Direct Debit

## 3.86.0 (2022-08-11)

- Add support for Desktop Web Login flow
- Add support for Mobile Web Fallback

## 3.85.5 (2022-07-21)

- Fix internal build issue

## 3.85.4

- Update @braintree/browser-detection to v1.14.0

## 3.85.3 (2022-04-06)

- Update @braintree/sanitize-url to v6.0.0
- Update promise-polyfill to v8.2.3
- Update restricted-input to v3.0.5
- Venmo
  - Fix issue where Samsung Browser was reporting as a supported browser
- Local Payments
  - Fix issue where query strings from URLs with a hash fragment _before_ the query string could not be parsed correctly
- Clarify Vault Manager `options.defaultFirst` functionality in JSDoc

## 3.85.2 (2022-01-21)

- Venmo
  - Fix issue where iOS Chrome was reporting as a supported browser when Venmo was configured for desktop
  - Improve Venmo modal UX in desktop flow
- UnionPay
  - Fix typo in our GraphQL Tokenization CREDIT_CARD_BRAND_MAP

## 3.85.1 (2022-01-13)

- Venmo
  - Fix issue where iOS Chrome was reporting as a supported browser

## 3.85.0 (2022-01-07)

- Client
  - Add Elo, Hiper, and Hipercard graphQL adapters to card
    tokenization responses
- Hosted Fields
  - Add support for Elo, Hiper, and Hipercard in tokenization
    payload
  - Fix issue where Hosted Fields won't lose focus if scrolled out
    of view on iOS
- Payment Request
  - Add support for Elo, Hiper, and Hipercard in tokenization
    payload
- Venmo
  - Expose `paymentContextId` when available

## 3.84.0 (2021-11-30)

- Client
  - Add Elo, Hiper, and Hipercard to `supportedCardTypes`
  - Fix issue where analytics event would report redundant errors
    when client fails to set up (\#606)
- Venmo
  - Adjust UI for better navigation

## 3.83.0 (2021-11-02)

- Data Collector
  - Updates `clientMetadataId` to `riskCorrelationId`
    (`clientMetadataId` is treated as an alias)
- Hosted Fields
  - Allow passing `iframeTitle` in fields configuration to customize
    iframe titles for field (\#545)
- Local Payments
  - Add `options.displayName` to `startPayment`
- Venmo
  - Fix issue where Facebook on Android would report as a supported
    browser

## 3.82.0 (2021-09-29)

- Update @braintree/browser-detection to v1.12.1
- Update inject-stylesheet@v5.0.0
- Venmo
  - Correct issue where the Venmo app could not be launched
    succesfully from the Facebook app
- Data Collector
  - Updates `correlationId` to `clientMetadataId` (`correlationId`
    is treated as an alias)

## 3.81.1 (2021-09-23)

- Venmo
  - Fix issue where `@` was sometimes not returned in username param
    upon successful tokenization

## 3.81.0 (2021-08-18)

- Data Collector
  - Allow passing custom correlation id when initializing data
    collector
- Visa Checkout
  - Add `encryptionKey` to `createInitOptions`

## 3.80.0 (2021-08-09)

- 3D Secure
  - deprecate `cardAdd` in `verifyCard` in favor of
    `cardAddChallengeRequested` (`cardAdd` can still be used as an
    alias)
  - update `cardAddChallengeRequested` in `verifyCard` to allow
    passing `false`
  - add `type` to `verifyCard` response payload
  - fix issue where v1 fallback could result in an unrecoverable
    exception (\#582)

## 3.79.1 (2021-07-12)

- Hosted Fields
  - Fix issue where inputs could not tab forward in iOS Safari 14.5+
    (tabbing backward is still broken) (\#456)

## 3.79.0 (2021-07-08)

- Fix issue where SDK could not be used with server side rendering in
  Node v16 (\#576)
- Hosted Fields
  - Fix issue where integrations with `select` configuraitons for
    expiration month and year would throw an error (\#578)
- PayPal Checkout
  - Fix issue in `loadPayPalSDK` where data attributes could be
    passed in with an extra `data-` prefix
- 3D Secure
  - Add `cardAdd` param to `verifyCard`
- Google Pay
  - Support Maestro cards

## 3.78.3 (2021-06-25)

- Update restricted-input to v3.0.4
- Hosted Fields
  - Fix issued where `binAvailable` event would not fire off when
    pasting a new credit card number over the previous card
  - Fix issue where some Mac OS input sources would not format
    correctly in Safari

## 3.78.2 (2021-06-15)

- Hosted Fields
  - Fix issue where Safari could not programatically focus to input
    (\#456)
  - Fix issue where iOS Safari could not tab forward through inputs
    (\#460)
  - Fix issue where Desktop Safari required 2 tabs to tab forward
    (\#490)

## 3.78.1 (2021-06-08)

- Venmo
  - Fix issue where Chrome for iOS would leave behind a blank
    window, making it difficult to return to the merchant page in
    manual return flow

## 3.78.0 (2021-06-08)

- Update browser-detection to v1.12.0
- Apple Pay
  - Support Elo cards
- Google Pay
  - Support Elo cards
- Venmo
  - Add `displayName` option
  - Fix issue where payment contexts where not cancelled correctly

## 3.77.0 (2021-06-03)

- Update @braintree/sanitize-url to v5.0.2
- Venmo
  - Add `paymentMethodUsage` parameter to create

## 3.76.4 (2021-05-11)

- Update card-validator to v8.1.1
- Local Payments
  - Fix issue where local payment window may not open
  - Fix issue where customer could get stranded when cancelling from
    a mobile banking app

## 3.76.3 (2021-04-30)

- Update @braintree/sanitize-url to v5.0.1
- Venmo
  - Fix issue where profile id was not being passed to Venmo Desktop
    flow

## 3.76.2 (2021-04-07)

- Update browser-detection to v1.11.1
- Hosted Fields
  - Fix issue where nested Shadow DOM elements would not allow the
    iframes to initialize
- Venmo
  - Fix issue where `venmo.isSupported({ allowNewBrowserTab: false })` was returning `true` for Firefox on iOS

## 3.76.1 (2021-03-31)

- Local Payments
  - Correct error code for a payment that fails on the bank side of
    the payment (was previously reported as the customer canceling
    the process)

## 3.76.0 (2021-03-22)

- Venmo
  - Add `useRedirectForIOS` flag as an alternate way to open Venmo
    flow in iOS environments

## 3.75.0 (2021-03-17)

- Hosted Fields
  - Add support for `box-shadow` style (\#559)
- PayPal
  - Add `offerPayLater` to PayPal `tokenize`
- PayPal Checkout
  - Correct default `intent` parameter to `tokenize` in
    `loadPayPalSDK` when using `vault: true`
- Venmo
  - Correct issue where incorrect return url could be constructed
    when merchant page url included an empty `#`
  - Fix issue with `requireManualReturn` flow in iOS webviews

## 3.74.0 (2021-03-05)

- PayPal Checkout
  - Default `intent` parameter to `authorize` in `loadPayPalSDK`
    when using `vault: true` to eliminate console error about using
    `tokenize` for intent (\#544)
  - Fix issue where dispatch frame would not get cleaned up when
    calling `teardown` (\#555)
- Local Payments
  - Add `bic` property to `options` parameter for iDEAL transactions
  - Update default size of window to 1282 X 720
  - Allow height and width of the window to be specified with
    `windowOptions.height` and `windowOptions.width` when calling
    `startPayment`

## 3.73.1 (2021-02-17)

- Update framebus to v5.1.2
  - Fix issue where components dependent on framebus (Hosted Fields,
    PayPal, etc) would not load in IE11 (\#554)

## 3.73.0 (2021-02-16)

- Venmo
  - Add `cancelTokenization` for programatic cancelation of the
    `tokenize` flow
  - Fix issue where venmo component may not yet be ready when
    beginning tokenization
  - Fix issue where Venmo would fail when embedded in an iframe

## 3.72.0 (2021-02-04)

- 3D Secure
  - Add `accountType` param to `verifyCard`

## 3.71.1 (2021-01-27)

- Update framebus to v5.1.0
- Data Collector
  - Fix issue where sandbox environment was not set for Advanced
    Fraud Protection

## 3.71.0 (2021-01-13)

- Update promise-polyfill to v8.2.0
- Update credit-card-type to v9.1.0
- Hosted Fields
  - Fix issue where card number would present as invalid when
    autofilled from cardholder name field (\#547)
  - Allow maxlength field to be greater than 10 for postal code
    inputs (\#551)

## 3.70.0 (2020-12-22)

- Local Payments
  - Add `paymentTypeCountryCode` as supported field when starting a
    local payment

## 3.69.0 (2020-11-05)

- Update @braintree/browser-detection to v1.11.0
- Update @braintree/extended-promise to v0.4.1
- Update framebus to v5.0.0
- Hosted Fields
  - Fix issue where multiple Hosted Fields instances would issue
    warnings in the console about duplicate ids (closes \#533)
- PayPal Checkout
  - Support displaying a customer's vaulted PayPal account when
    rendering the PayPal SDK using `options.autoSetDataUserIdToken`
    in the create call

## 3.68.0 (2020-10-13)

- Update framebus to v4.0.4
- Apple Pay
  - Support Maestro cards
- Hosted Fields
  - Support `text-align` style
- PayPal Checkout
  - Fix issue in `loadPayPalSDK` where PayPal SDK should have been
    loaded in the head of the document instead of the body to allow
    re-loading the SDK dynamically

## 3.67.0 (2020-09-29)

- Update @braintree/sanitize-url to v5.0.0
- Client
  - Provide `CLIENT_AUTHORIZATION_INVALID` error when client token
    has expired or a tokenization key has been deactivated or
    deleted
- Venmo
  - Add `allowWebviews` configuration to `isBrowserSupported`

## 3.66.0 (2020-09-21)

- Hosted Fields
  - Fix issue where cardholder name field would present a number
    keyboard on iOS devices (closes \#523)
  - Fix issue where incorrect keyboard would be used for mobile
    devices that do not support input formatting
  - Fix issue where autocomplete cannot run multiple times (closes
    \#479)
  - Add autofill handling for every hosted field (closes \#480)
- PayPal Checkout
  - In sandbox, use client id found in merchant configuration for
    `loadPayPalSDK` instead of always using `sb`
  - Allow data attributes to be passed to `loadPayPalSDK`
  - Fix issue when tokenizing during `requestBillingAgreement: true`
    flows
  - Fix issue where `intent` used in `createPayment` was not passed
    to `tokenizePayment` in PayPal JS SDK
- Venmo
  - Remove use of `global` (use `window` instead for better
    compatibility)
- 3D Secure
  - Add `authentication-modal-render` and
    `authentication-modal-close` events

## 3.65.0 (2020-08-25)

- Update @braintree/event-emitter to v0.4.1
- Update card-validator to v8.1.0
- Update restricted-input to v3.0.3
- Hosted Fields
  - Allow setting `margin-top`, `margin-right`, `margin-bottom`,
    `margin-left` in styles (\#513)
  - Allow setting `padding-top`, `padding-right`, `padding-bottom`,
    `padding-left` in styles (\#513)
  - Fix issue where autofilling with a Google Pay card while using
    `maskInput` would fail to fill the card number
  - Fix issue where fields in shadow DOM would have incorrect high
    compared to container
  - Add `cardholderName` as supported field
  - Add `cardholderName` as a field in the tokenization payload
- PayPal Checkout
  - Add `requestBillingAgreement` and `billingAgreementDetails` to
    createPayment
- 3D Secure
  - Add event for when a customer cancels the verification
  - Add `rawCardinalSDKVerificationData` to `verifyCard` payload

## 3.64.2 (2020-08-06)

- Update inject-stylesheet to v4.0.0
- Hosted Fields
  - Fix issue where inputs would not load if `-moz` attributes are
    used in Google Chrome (\#516)
  - Fix issue where `preventAutofill` did not work in the Chrome
    browser

## 3.64.1 (2020-07-30)

- Update restricted-input to v3.0.2

## 3.64.0 (2020-07-30)

- Use @braintree/uuid for uuid generation
- Update @braintree/browser-detection to v1.10.0
- Update card-validator to v8.0.0
- Update credit-card-type to v9.0.1
- Update iframer to v1.1.0
- Update inject-stylesheet to v3.0.0
- Update restricted-input to v3.0.1
- Update @braintree/asset-loader to v0.4.4
- Update @braintree/class-list to v0.2.0
- Update @braintree/event-emitter to v0.4.0
- Update @braintree/extended-promise to v0.4.0
- Update @braintree/sanitize-url to v4.1.1
- Update @braintree/wrap-promise to v2.1.0
- Hosted Fields
  - Allow internal labels to be configured for localization with
    `internalLabel` field property
  - Mark hidden inputs inside iframe (used to support autofill
    capabilities in browsers) with `aria-hidden`
  - Fix issue where autofill would not function in Chrome for iOS
    (closes \#491)
  - Allow opt out of credit card autofill with `preventAutofill`
    option
  - Support web components (closes \#495)

## 3.63.0 (2020-07-07)

- Update framebus to v4.0.2 (fixes \#504)
- Update restricted-input to v2.1.1
- Update @braintree/extended-promise to v0.3.1
- Use `window` instead of `global` in source code (closes \#401)
- PayPal Checkout
  - Add `loadPayPalSDK` method to dynamically load the v5 PayPal SDK

## 3.62.2 (2020-06-12)

- Update framebus to v4.0.1

## 3.62.1 (2020-05-12)

- Google Pay
  - Fix issue where PayPal via Google Pay would not be enabled for
    eligible merchants

## 3.62.0 (2020-04-30)

- Venmo
  - Fix issue where a single page app's router may disrupt the Venmo
    tokenization
  - Add `ignoreHistoryChanges` to create options
  - Fix issue where Android webviews could not app switch correctly

## 3.61.0 (2020-04-23)

- Update sanitize-url to v4.0.1
- Google Pay
  - Add `bin` to GooglePayment `tokenizedPayload`

## 3.60.0 (2020-03-19)

- Apple Pay
  - Add `useDeferredClient` option when creating instance
  - `createPaymentRequest` will return a promise if instantiated
    with `useDeferredClient` and `authorization` instead of a client
- Google Pay
  - Add `useDeferredClient` option when creating instance
  - `createPaymentDataRequest` will return a promise if instantiated
    with `useDeferredClient` and `authorization` instead of a client
- PayPal Checkout
  - Added `cobrandedCardLabel` to the `tokenizePayment` response
- 3D Secure
  - Update to use deferred client
- Venmo
  - Update to use deferred client
- Vault Manager
  - Update to use deferred client

## 3.59.0 (2020-03-04)

- Data Collector
  - Add `useDeferredClient` option when creating instance
  - Add `getDeviceData` method to get device data asynchronously
- Hosted Fields
  - add `getChallenges` method
  - add `getSupportedCardTypes` method
- PayPal Checkout
  - Provide way to opt-out of auto-vaulting behavior
  - Add `getClientId` method

## 3.58.0 (2020-02-13)

- Update `@braintree/extended-promise` to v0.3.0
- Data Collector
  - Hide Kount iframe from screen readers (\#484 thanks @iamstratos)
- Hosted Fields
  - Fixes issue where React frameworks could not pass DOM nodes in
    as `container` in `fields` (\#487)
- Venmo
  - Fix issue where webview integrations could not tokenize
  - Add `processResultsDelay` configuration to `tokenize`

## 3.57.0 (2020-01-10)

- 3D Secure
  - Fix issue where cardinal sdk options were not being used
  - Falls back to a v1 flow if v2 SDK setup fails

## 3.56.0 (2019-12-10)

- 3D Secure
  - Add `cardinalSDKConfig` option to `create` method. Supported
    properties:
    - `timeout`
    - `maxRequestRetries`
    - `logging`
    - `payment.displayLoading`
    - `payment.displayExitButton`
- Venmo
  - Use `hashchange` event listener to detect when Venmo
    tokenization has completed

## 3.55.0 (2019-10-24)

- Fix issue where not passing in an `authorization` to components
  would throw a misleading error
- Update restricted-input to v2.1.0
- Client
  - Retry failed connections to Braintree Gateway due to TCP
    Preconnect errors in all browsers
- Google Pay
  - Add support for `isNetworkTokenized` param in `parseResponse`
    method
- Hosted Fields
  - Fix issue where pasting a card number over an Amex number could
    cut off the last digit
- PayPal Checkout
  - Added support for shipping_options
  - Add `vaultInitiatedCheckoutPaymentMethodToken` parameter to
    `createPayment`

## 3.54.2 (2019-10-17)

- Update @braintree/sanitize-url to v4.0.0
- Client
  - Fix issue where client may emit an uncaught exception error in
    the console for an invalid authorization (fixes \#465)
- Local Payments
  - Fix issue where callback could not be used in Mobile fallback
    flow

## 3.54.1 (2019-10-10)

- Venmo
  - Fix issue where params may be malformed upon tokenization

## 3.54.0 (2019-10-08)

- 3D Secure
  - Add `2-bootstrap3-modal` as a `version` option
  - Add `2-inline-iframe` as a `version` option
  - Fix issue where billing address information was not being sent
    to lookup if no additional information was sent

## 3.53.0 (2019-09-25)

- Update `@braintree/browser-detection` to v1.9.0
- Hosted Fields
  - Pass back new regulation environments dynamically as they become
    available
  - Fix issue where Firefox would require two shift-tabs to navigate
    away from a field
  - Fix issue where IE9-11 could not tab correctly
- 3D Secure
  - Allow raw string to be passed into
    `initializeChallengeWithLookupResponse` method
  - Deprecate `onLookupComplete` param in `verifyCard` in favor of
    setting a listener for `lookup-complete`
  - Add `requiresUserAuthentication` param to lookup data in
    `onLookupComplete` callback
  - Fix issue where `initializeChallengeFrameWithLookupResponse`
    would error if called too quickly after creation

## 3.52.1 (2019-09-13)

- Update credit-card-type to v8.3.0
- Hosted Fields
  - Software keyboards can now navigate hosted fields even when
    they're interspersed with merchant fields
  - Fix bug on desktop where fields could not navigate between
    fields with native inputs between the hosted fields
  - Fix issue where regulation environment information was not
    parsed correctly

## 3.52.0 (2019-09-06)

- Update event-emitter to v0.3.0
- Hosted Fields
  - Add `margin` to allowed CSS rules (closes \#449)
- 3D Secure
  - Fix issue where `bin` was not being passed along to Cardinal SDK

## 3.51.0 (2019-08-29)

- Hosted Fields
  - Add `authenticationInsight` option to tokenization
  - Fix issue where validation errors without field errors could
    cause a syntax error
- 3D Secure
  - Enable `cancelVerifyCard` method for 3D Secure version 2
    integrations
  - Update songbird.js script urls

## 3.50.1 (2019-08-14)

- Update restricted-input to v2.0.2
- Update browser-detection to v1.8.0
- 3D Secure
  - Fix issue where an error may be thrown when cancelling the 3D
    Secure flow
  - Add better handling for lookup errors
  - Fix issue where component would throw an error when creating a
    3ds component without a Cardinal Authentication JWT
- Google Pay
  - Fix issue where Google Pay would error in Edge (\#446)
- Hosted Fields
  - Fix issue where chrome books could not input correctly with a
    soft keyboard

## 3.50.0 (2019-07-29)

- Hosted Fields
  - Add `expirationMonth` and `expirationYear` to tokenization
    payload

## 3.49.0 (2019-07-25)

- Hosted Fields
  - Add `binAvailable` event
- 3D Secure
  - Add `threeDSecureInfo` to the `verifyCard` response

## 3.48.0 (2019-07-11)

- Us Bank Account
  - Bring out of Beta into General Availability

## 3.47.0 (2019-07-09)

- Update `asset-loader` to v0.3.1
- Update `event-emitter` to v0.2.0
- Data Collector
  - Pass back invalid options error at beginning of data collector
    setup
- Hosted Fields
  - Add `container` param for field, to pass in CSS selector or a
    DOM node as field container
  - Make `selector` param an alias for `container`
  - Add `off` method for unsubscribing from events without tearing
    down
  - Add `setMonthOptions` method to dynamically update options for
    expiration month's configured as select elements (\#393)
- 3D Secure
  - Add 3DS version 2 support
  - Deprecate version 1 flow
- UnionPay
  - Fix issue where calling `fetchCapabilities` twice in quick
    succession causes the subsequent requests to not fire (\#441)

## 3.46.0 (2019-06-12)

- Update restricted-input to v2.0.1
- Update inject-stylesheet to v2.0.0
- Add `title` and `aria-hidden` attributes to iframes created within
  `frameService` for accessibility (\#434, thanks @TomPridham)
- Hosted Fields
  - Add configuration to validate specific card brands, overriding
    merchant control panel settings

## 3.45.0 (2019-05-16)

- Update @braintree/wrap-promise to v2.0.0 - errors thrown inside
  developer supplied callback functions will log to the console
- Update restricted-input to v2.0.0
- Google Pay
- Throw an error if an unsupported version of Google Pay API is used
- Use GooglePayment PayPal client ID
- Hosted Fields
  - Allow specifying only a subset of fields to be validated and
    tokenized
  - Fix issue where Chrome iOS autofill would not fill in full card
    number
- Local Payments
  - Update endpoint for creating local payments

## 3.44.2 (2019-04-10)

- Update @braintree/sanitize-url to v3.1.0
- Google Pay
  - Fix issue where tokenization details for Google Payments could
    accidentally be dropped
- Masterpass
  - Fix issue with invalid callback url
- PayPal Checkout
  - Fix bug where merchant account id was not being applied in vault
    flows

## 3.44.1 (2019-04-03)

- Hosted Fields
  - Fix issue tabbing between fields on mobile devices
  - Update credit-card-type to v8.2.0, fixes an issue where UnionPay
    cards of lengths 14 or 15 were not marked as valid
- Local Payment
  - Fix typo where the fallback scenario could not succesfully
    tokenize

## 3.44.0 (2019-04-01)

- Data Collector
  - Fix issue where PayPal data collection could not teardown all
    scripts
  - Fix issue where PayPal data collection would not setup correctly
    when initialized more than once
  - Speed up PayPal data collection setup when initialized more than
    once
- Local Payment
  - Fix issue where fallback URL was not decoded correctly

## 3.43.0 (2019-03-12)

- Update credit-card-type to v8.1.0
- Client
  - Add bin to credit card tokenization payload
- Hosted Fields
  - Add bin to credit card tokenization payload
- Payment Request
  - Add bin to credit card tokenization payload
- PayPal Checkout
  - Update component for compatibility with
    <https://www.paypal.com/sdk/js>

## 3.42.0 (2019-01-15)

- Update @braintree/sanitize-url to v3.0.0
- Hosted Fields
  - Fixes issue where inputs would not focus after initial touch
    event on iOS Safari (\#405, thanks @lgodziejewski)
  - Allow `maxCardLength` in `number` field
  - Fix issue where UnionPay cards were not checked for luhn
    validity
- PayPal Checkout
  - When passing in `authorization` instead of a `client` in
    component creation, the client will be created in the background
    (improves loading time)
- Payment Request
  - Add canMakePayment method

## 3.41.0 (2018-12-20)

- Add Local Payments component
- PayPal Checkout
  - Add support for `lineItems`
- Payment Request
  - Support Google Pay v2
  - Support PayPal in Google Pay

## 3.40.0 (2018-12-06)

- Update framebus to v3.0.2
- 3D Secure
  - Allow creating component with an `authorization` instead of a
    `client`
- American Express
  - Allow creating component with an `authorization` instead of a
    `client`
- Apple Pay
  - Allow creating component with an `authorization` instead of a
    `client`
- Data Collector
  - Allow creating component with an `authorization` instead of a
    `client`
- Google Payment
  - Allow Google Pay Version 2 requests
  - Allow direct tokenization of PayPal accounts
  - Allow creating component with an `authorization` instead of a
    `client`
- Hosted Fields
  - Allow creating component with an `authorization` instead of a
    `client` (added in v3.38.1, documented in v3.40.0)
- Masterpass
  - Allow creating component with an `authorization` instead of a
    `client`
- Payment Request
  - Allow creating component with an `authorization` instead of a
    `client`
- PayPal
  - Allow creating component with an `authorization` instead of a
    `client`
- PayPal Checkout
  - Fix issue where `merchantAccountId` option could not be used
    when the default Merchant Account did not have PayPal enabled
  - Allow creating component with an `authorization` instead of a
    `client`
- UnionPay
  - Allow creating component with an `authorization` instead of a
    `client`
- US Bank Account
  - Allow creating component with an `authorization` instead of a
    `client`
- Vault Manager
  - Allow creating component with an `authorization` instead of a
    `client`
- Venmo
  - Fix issue where url may be overwritten when a hash is not
    present \#394 (thanks @arettberg)
  - Add `deepLinkReturnUrl` to `venmo.create`
  - Allow creating component with an `authorization` instead of a
    `client`
- Visa Checkout
  - Allow creating component with an `authorization` instead of a
    `client`

## 3.39.0 (2018-10-30)

- PayPal Checkout
  - Add `merchantAccountId` to PayPal `options`
- Update promise-polyfill to v8.1.0
- Use @braintree/class-list for manipulating classes
- Use @braintree/asset-loader for loading assets
- Client
  - Speed up client creation caching and prevent race conditions
- Hosted Fields
  - Fix issue where analytics in iframe could be out of sync with
    analytics on merchant page

## 3.38.1 (2018-10-09)

- Update credit-card-type to v8.0.0
- Update card-validator to v6.0.0

## 3.38.0 (2018-09-24)

- Hosted Fields
  - Only accepts Luhn valid UnionPay cards. Previously, non-Luhn
    valid card numbers were accepted even though they were not
    supported by Braintree
- Payment Request
  - Fix issue where npm browser builds could not load payment
    request (\#388)

## 3.37.0 (2018-09-05)

- Provide browser compatible files on npm for each component in
  `dist/browser/component-name.js` (\#366)
- Update credit-card-type to v7.1.0
- Hosted Fields
  - Detect if `Mir` credit card is entered
  - Fix issue where Android text field would be selected when
    focused after inputting data (\#379)
  - Fix error emitted by Chrome (in verbose logging mode) for not
    using a passive flag for `touchstart` event

## 3.36.0 (2018-08-09)

- Update promise-polyfill to v8.0.0
- Provide browser compatible file on npm in `dist/browser` (\#366)
- Google Pay
  - Preserve `allowedCardNetworks` from default configuration in
    `cardRequirements` if not overwritten in
    `createPaymentDataRequest`
- Hosted Fields
  - Add option to reveal last four of credit card number when
    masking input
  - Expose error when no field keys are passed into fields object
    (\#355)

## 3.35.0 (2018-07-27)

- Add title attribute to iframes to improve accessibility for
  screenreaders (\#374)
- Vault Manager
  - Expose if fetched payment methods have an associated
    subscription

## 3.34.1 (2018-07-10)

- Update credit-card-type to v7.0.0
- Update card-validator to v5.0.0
- Client
  - Fix client cache issue when using teardown
- Data Collector
  - Hide 1px Kount iframe
- Hosted Fields
  - Fix improper validation on iPad keyboards for expiration date
    field
    [\#369](https://github.com/braintree/braintree-web/issues/369)
  - Fix issue where extra history events would be added in Chrome
    and Firefox
- Venmo
  - Add validation for profile ids (must be strings)

## 3.34.0 (2018-05-16)

- Apple Pay
  - Fix issue with Apple Pay configuration
    [\#365](https://github.com/braintree/braintree-web/issues/365)
- Hosted Fields
  - Include data about the containers for invalid fields in
    tokenization error (\#359)
  - Fix issue where inputs would not mask in iOS
- 3D Secure
  - Fix issue where payment method details were not provided in the
    flow where an iframe is not needed
  - Fix issue where description in verify card payload was coming
    back with `+` symbols instead of spaces
  - Add binData property to verify card payload

## 3.33.0 (2018-05-07)

- Internal performance optimizations
- Update framebus to v3.0.1
- Update credit-card-type to v6.3.0
- Hosted Fields
  - Allow passing in class name for style configuration (\#361)
  - Fix issue where tokenization could not take place because the
    `window.length` variable had been overwritten
  - Fix regression where sending card numbers with - or spaces would
    result in cardType unknown in the payload (\#241)
- Payment Request
  - Fix issue with changing shipping address and shipping options
    which could cause Chrome to crash

## 3.32.1 (2018-04-19)

- Payment Request
  - Expose errors more gracefully
- Hosted Fields
  - Revert fix issue where Roboform could not autofill cards
    [\#356](https://github.com/braintree/braintree-web/issues/356).
    It was causing an issue where the inputs would be hidden in
    Safari if their container was changed from `display: none` to
    `display: block`

## 3.32.0 (2018-04-05)

- Venmo
  - Add support for Venmo profile IDs
- Google Pay is no longer in beta.
- Masterpass
  - Fix issue where error would not surface correctly for window
    being blocked by a popup blocker
- PayPal
  - Fix issue where error would not surface correctly for window
    being blocked by a popup blocker
- Hosted Fields
  - Fix issue where autocomplete properties were not applied (closes
    \#353)
  - Ensure that focus state is maintained when focus is called
    programatically
  - Cards that cannot be processed by the merchant can invalidate
    Hosted Fields by adding a `fields.number.rejectUnsupportedCards`
    option to the object passed into Hosted Fields `create`. See
    documentation for adding this property.
  - Fix issue where Roboform could not autofill cards
    [\#356](https://github.com/braintree/braintree-web/issues/356)
- PayPal Checkout
  - Fix error handling around not having a linked PayPal sandbox
    account
- 3D Secure
  - Add support for American Express SafeKey params

## 3.31.0 (2018-02-08)

- Update credit-card-type to v6.2.0
- Update card-validator to v4.3.0
- Venmo
  - Add browser support detection helper as static method on
    `braintree.venmo.isBrowserSuppported`

## 3.30.0 (2018-02-02)

- Update promise-polyfill to v7.0.2 (\#350 thanks @Macavity)
  - Fixes issues with promises not working in IE from
    v3.28.0-v3.29.0
- Hosted Fields
  - Add `padding` to supported CSS attributes (\#104)

## 3.29.0 (2018-01-30)

- Update credit-card-type to v6.1.1
- Update jsdoc-template to v3.2.0
- Hosted Fields
  - Fix issue where some series 2 Mastercard bin ranges were not
    being detected (internal assets for v3.19.1 forward have this
    fix applied)

**BREAKING CHANGES**

- Google Pay - Beta
  - Switch from using iframe based solution to Google pay.js script
    tag solution
    - `braintree.googlePayment.isSupported` has been removed
    - `tokenize` and `createSupportedPaymentMethodsConfiguration`
      and `on` methods and has been removed. See documentation
      example for new integration pattern.

## 3.28.1 (2018-01-25)

- Update @braintree/sanitize-url to v2.1.0

## 3.28.0 (2018-01-10)

- Update promise-polyfill to v7.0.0
- American Express
  - Add missing `teardown` method
- Apple Pay
  - Add missing `teardown` method
- Client
  - Add missing `teardown` method
- Google Pay
  - References to Pay with Google have now been converted to Google
    Pay in accordance with Google's brand guidelines
- PayPal Checkout
  - Add missing `teardown` method
- Vault Manager
  - Add missing `teardown` method
- Venmo
  - Add missing `teardown` method
- Visa Checkout
  - Add missing `teardown` method

**BREAKING CHANGES**

- Google Pay - Beta
  - Error codes that included `PAY_WITH_GOOGLE` have been updated to
    `GOOGLE_PAYMENT`
    - PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE
      -\> PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE
    - PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR -\>
      PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR
- Payment Request - Beta
  - Change `payWithGoogle` property to `googlePay` property when
    instantiating a Payment Request component with
    `enabledPaymentMethods` option

## 3.27.0 (2017-12-26)

- Update card-validator to v4.2.0
- Internal performance optimizations
- Prefer popup bridge before browser supporting popups in frame
  service (\#341, thanks @night)
- Hosted Fields
  - Send back timeout error if Hosted Fields takes longer than 60
    seconds to set up
  - Allow locality (the city) to be sent as part of billing address
    fields
  - Allow region (the state) to be sent as part of billing address
    fields
  - Allow cvv to have minlength be applied when using cvv only
    integration
- Masterpass
  - Throw MASTERPASS_POPUP_FAILED if required params returned by
    masterpass are missing
- Payment Request - Beta
  - Support `requestShipping` option
- Pay with Google - Beta
  - Support `requestShipping` option

## 3.26.0 (2017-11-14)

- Hosted Fields
  - Correct bug where pasting in on an iOS device would mangle the
    input (<https://github.com/braintree/restricted-input/pull/46>)
  - Update credit-card-type to version 6.1.0 (accept JCB cards of
    length 17-19)

## 3.25.0 (2017-10-27)

- Hosted Fields
  - Add `setMessage` for screenreader-compatible error messages
  - Fix issue where autofill would not work in selects with month
    values 1-9 (\#\#331)
  - Allow fields to be prefilled with values
- Payment Request - Beta
  - Add `lastFour` to tokenize payload

## 3.24.1 (2017-10-19)

- Update credit-card-type to v6.0.0
- Update card-validator to v4.1.1
- Hosted Fields
  - `niceType` for Mastercard will now render as `Mastercard`
    instead of `MasterCard` to match Mastercard's brand guidelines
- Pay with Google - Beta
  - Correct isSupported to only return true on Android Chrome v61
    and higher

## 3.24.0 (2017-10-12)

- 3D Secure
  - Error early in creation if a tokenization key is used for
    authorization
  - Add liablity shift info to top level of cancelVerifyCard payload
- Payment Request - Beta
  - Add billing address details to tokenization payload
- Pay with Google - Beta
  - Apply field to allow tokenization with tokenization key
  - Properly wrap Pay with Google so callbacks can be used

**BREAKING CHANGES**

- Payment Request and Pay with Google - Beta
  - Some non-essential fields from tokenize payload removed

## 3.23.0 (2017-09-29)

- Add beta Pay with Google Component
- Add beta Payment Request Component
- Update sanitize-url to version 2.0.2
- Update restricted-input to version 1.2.6
- Data Collector
  - Update sjcl to 1.0.7
  - Provide raw device data object as `instance.rawDeviceData`
- Hosted Fields
  - Add `billingAddress.extendedAddress` as a tokenization option
  - Add `billingAddress.company` as a tokenization option
  - Add `billingAddress.firstName` as a tokenization option
  - Add `billingAddress.lastName` as a tokenization option
- 3D Secure
  - Allow opting out of bank frame loader
- Vault Manager
  - Provide bin data if present

## 3.22.2 (2017-08-21)

- Update sanitize-url to version 2.0.0
- 3D Secure
  - Add `liabilityShifted` and `liabilityShiftPossible` to the top
    level when 3DS lookup fails to open a 3DS iframe.
- Hosted Fields
  - Fix issue where inputs would not mask correctly when autofilled
  - Update credit-card-type to version 5.0.4
  - Fix issue where placeholder would not load in IE9

## 3.22.1 (2017-08-14)

- Security improvements
- Data Collector
  - Fix bug where Data Collector with Kount could not be torn down
    more than once (\#314)

## 3.22.0 (2017-08-08)

- Hosted Fields
  - Fix regression where postal code input would not display alpha
    numeric keyboard on iOS
  - Add bin data to tokenization payload
  - Add option for input masking

## 3.21.1 (2017-08-02)

- Hosted Fields
  - Fix regression where iframes could not load on IE 9 and 10

## 3.21.0 (2017-07-31)

- Hosted Fields
  - Fix issue where phone number keyboard would display on iOS
    devices
  - Allow passing `countryName`, `countryCodeAlpha2`,
    `countryCodeAlpha3`, and `countryCodeNumeric` under
    `billingAddress` as a tokenization option
  - Fix issue where Apple based browsers (Safari, iOS Chrome, iOS
    Firefox, etc) would add multiple history states when Hosted
    Fields loads

## 3.20.1 (2017-07-26)

- Update browser-detection to v1.6.0
- Hosted Fields
  - Fix issue where field would not blur on iOS when tapping out of
    the Hosted Fields inputs
- PayPal
  - Fix issue in iOS Firefox where PayPal window would not open

## 3.20.0 (2017-07-19)

- Client
  - Add request retries for TCP preconnect errors in Internet
    Explorer and Edge
- Hosted Fields
  - Update restricted-input to version 1.2.5
  - Fix bug where placeholder would be set to null after
    autocomplete fires if no placeholder was set
  - Allow passing `streetAddress` under `billingAddress` as a
    tokenization option
  - Fix issue where Hosted Fields would not load intermittently in
    Edge and IE11
  - Fix issue where Hosted Fields validity would not update after
    paste events (\#308)

## 3.19.1 (2017-07-05)

- Client
  - Cache client creation when using the same authorization
- Hosted Fields
  - Update credit-card-type to v5.0.3 to fix a bug where certain
    MasterCard bins were not being marked as potentially valid
- Inline JS in HTML frames

## 3.19.0 (2017-06-15)

- Hosted Fields
  - Allow `cardholderName` to be passed while tokenizing the card
  - Fix bug disabling fields when enter is pressed

## 3.18.0 (2017-06-06)

- Hosted Fields
  - Fix autofill issues for Chrome and Safari (\#239)

## 3.17.0 (2017-05-30)

- Hosted Fields
  - Add `minlength` to fields options to set the `minlength` of
    postal code inputs
  - Update credit-card-type dependency (UnionPay detection fixes)
  - Update restricted-input dependency to 1.2.1 (Browser Detection
    updates)
- PayPal
  - Frame fixes in iOS

## 3.16.0 (2017-05-18)

- Client
  - Access version with `getVersion()`
- Hosted Fields
  - Fix bug where inputs would not load intermittently on old
    browsers (\#233)
  - Typing `1/` in an expiration date field will now result in `01 /` formatting (\#221)
  - Fix bug where certain webviews would cause inputs to be
    untypable after tapping a second time (\#207)
- Masterpass
  - Enable Masterpass as a payment option
- PayPal
  - Mark PayPal component as deprecated in favor of using PayPal
    Checkout

## 3.15.0 (2017-05-09)

- Hosted Fields
  - Fix bug where expiration dates using select boxes would print an
    error when selected on mobile devices
  - Fix a bug where Android Webviews on KitKat could not enter more
    than 4 characters in inputs
  - Add supportsInputFormatting method to check if browser will
    support input formatting
- Data Collector
  - Cache and reuse device data when created multiple times with the
    same Kount merchant id
  - Fix issue where Kount data was not collected by additional Data
    Collector instances

## 3.14.0 (2017-04-25)

- American Express
  - `americanExpress.create` returns a promise if no callback is
    provided
  - `americanExpress.getRewardsBalance` returns a promise if no
    callback is provided
  - `americanExpress.getExpressCheckoutProfile` returns a promise if
    no callback is provided
- Apple Pay
  - `applePay.create` returns a promise if no callback is provided
  - `applePay.performValidation` returns a promise if no callback is
    provided
  - `applePay.tokenize` returns a promise if no callback is provided
- Hosted Fields
  - `hostedFields.tokenize` returns a promise if no callback is
    provided
  - `hostedFields.addClass` returns a promise if no callback is
    provided
  - `hostedFields.removeClass` returns a promise if no callback is
    provided
  - `hostedFields.setAttribute` returns a promise if no callback is
    provided
  - `hostedFields.removeAttribute` returns a promise if no callback
    is provided
  - `hostedFields.setPlaceholder` returns a promise if no callback
    is provided
  - `hostedFields.clear` returns a promise if no callback is
    provided
  - `hostedFields.focus` returns a promise if no callback is
    provided
- PayPal
  - Add support for PayPal Credit in Vault flow
  - `paypal.create` returns a promise if no callback is provided
  - `paypal.tokenize` returns a promise if no callback is provided
  - `paypal.teardown` returns a promise if no callback is provided
  - `paypal.closeWindow` closes the PayPal window if open
  - `paypal.focusWindow` focuses the PayPal window if open
- PayPal Checkout
  - Add support for PayPal Credit in Vault flow
- 3D Secure
  - `threeDSecure.create` returns a promise if no callback is
    provided
  - `threeDSecure.verifyCard` returns a promise if no callback is
    provided
  - `threeDSecure.cancelVerifyCard` returns a promise if no callback
    is provided
  - `threeDSecure.teardown` returns a promise if no callback is
    provided
- Union Pay
  - `unionPay.create` returns a promise if no callback is provided
  - `unionPay.enroll` returns a promise if no callback is provided
  - `unionPay.fetchCapabilities` returns a promise if no callback is
    provided
  - `unionPay.teardown` returns a promise if no callback is provided
  - `unionPay.tokenize` returns a promise if no callback is provided
- Visa Checkout
  - `visaCheckout.create` returns a promise if no callback is
    provided
  - `visaCheckout.tokenize` returns a promise if no callback is
    provided

## 3.13.0 (2017-04-21)

- Hosted Fields
  - Fix an issue where Firefox did not receive focus/blur events
    consistently when navigating fields via tab key
  - Provide specific errors for problems with tokenization
  - Add `focus` to allow programmatic focusing of inputs
  - Add `maxlength` to fields options to set the `maxlength` of CVV
    and postal code inputs. Use cases:
    - Limiting the length of the CVV input for CVV-only
      verifications when the card type is known
    - Limiting the length of the postal code input when cards are
      coming from a known region

## 3.12.1 (2017-04-06)

- PayPal
  - Fix bug where PayPal did not detect when the Popup was closed by
    the customer

## 3.12.0 (2017-04-04)

- Client
  - Fix a bug where `atob` was not being called with the window
    context
- Hosted Fields
  - Add support for `appearance` CSS rule
- PayPal
  - Fix support issues
- Visa Checkout
  - Add Visa Checkout component

## 3.11.1 (2017-03-24)

- Client
  - Fix a bug where errors within the request callback function were
    being caught by the request promise instead of bubbling up
- PayPal Checkout
  - Allow tokenization keys to use the `vault` flow

## 3.11.0 (2017-03-14)

- Hosted Fields
  - `hostedFields.create` now returns a promise if no callback is
    provided
  - `hostedFields.tokenize` now returns a promise if no callback is
    provided
- PayPal Checkout
  - Enable webview support
  - `intent` property is now passed in correctly
- Vault Manager
  - Create the Vault Manager component

## 3.10.0 (2017-03-08)

- Client
  - Fix bug where creation errors did not bubble up correctly
- Data Collector
  - Fix bug where creation errors did not bubble up correctly
- Hosted Fields
  - Add `removeAttribute` to allow removal of certain input
    attributes
  - Add RTL language support
- PayPal
  - Add synchronous method to determine if PayPal supports the
    browser
- PayPal Checkout
  - Add synchronous method to determine if PayPal Checkout supports
    the browser
  - Fix bug that caused some errors to be uncatchable
  - Add `landingPageType` as a tokenization option
    - `login` - A PayPal account login landing page is used
    - `billing` - A non-PayPal account landing page is used
  - Provide error when PayPal Checkout can not be used because there
    is no linked PayPal Sandbox account

## 3.9.0 (2017-02-23)

- Client
  - `client.request` now returns a promise if no callback is
    provided.
  - `client.create` now returns a promise if no callback is provided
- Data Collector
  - `dataCollector.create` now returns a promise if no callback is
    provided
  - `dataCollectorInstance.teardown` now returns a promise if no
    callback is provided
- Hosted Fields
  - Fix bug where some versions of IE could not render Hosted Fields
    inputs because of `window.top` being undefined
  - Fix autofill for 1Password extensions
  - Correct detection of Samsung browsers to disable input
    formatting in old versions
  - Allow passing `postalCode` as an option when the `postalCode`
    field is not enabled
- PayPal
  - Add `landingPageType` as a tokenization option
    - `login` - A PayPal account login landing page is used
    - `billing` - A non-PayPal account landing page is used
  - Add support for PopupBridge
- PayPal Checkout
  - Pass in correlation id from billing agreement token or ec token
    when tokenizing

## 3.8.0 (2017-02-08)

- Pre-bundled files are now published to npm, fixing parsing errors
  when using webpack
- Hosted Fields
  - Fix a bug where Mobile Safari would not emit blur events
    consistently
  - Add support for new Visa card numbers with 18 or 19 digits
  - Add `setAttribute` to allow dynamic updating of input attributes
  - Validate `setPlaceholder` to accept only strings and numbers
- 3D Secure
  - HTTPS is no longer required for sandbox environments
- PayPal Checkout
  - Return PayPal Credit financing details when calling
    `tokenizePayment`
- American Express
  - Fix bug where arguments to `getRewardsBalance` were mutated
- PayPal
  - Call callback with BROWSER_NOT_SUPPORTED error when using
    Chrome for iOS v47 or lower

## 3.7.0 (2017-01-31)

- Client
  - Fix issue where `getConfiguration` and `toJSON` were not
    returning the same object
- Hosted Fields
  - Fix a bug when placeholders aren't supplied for expiration
    month/year
  - Fix a bug where CVV field wouldn't validate all possible card
    type CVV lengths
  - Fix a bug where Samsung keyboards would incorrectly highlight
    the first character typed
  - Disable input formatting in the Android Samsung Internet browser
- PayPal
  - Return PayPal Credit financing details in
    `tokenizePayload.creditFinancingOffered`
- PayPal Checkout
  - Create the PayPal Checkout component to integrate with PayPal's
    [checkout.js library](https://github.com/paypal/paypal-checkout)

## 3.6.3 (2016-12-21)

- Hosted Fields
  - Fix bug where Samsung Keyboards would format incorrectly in
    Android Chrome

## 3.6.2 (2016-12-13)

- American Express
  - Fix bug where additional options were not passed along in
    getRewardsBalance request
- Hosted Fields
  - Fix a bug where unformatted inputs could not tokenize card
    numbers with hyphens or spaces
  - Fix a bug where postal codes of length 3 (e.g. in Iceland) were
    considered invalid
  - Fix input formatting with third party keyboards on Android
    Chrome

## 3.6.1 (2016-12-01)

- Hosted Fields
  - Fix a bug where iOS Safari autocomplete would not print credit
    card number
- PayPal
  - Fix bug where the PayPal authorization flow began when the
    `flow` option was missing or invalid
- 3D Secure
  - Fix bug where failing `verifyCard` call put component in an
    inconsistent state

## 3.6.0 (2016-11-11)

- Data Collector
  - Fix iframe styling in PayPal fraud tools
- Hosted Fields
  - Add support for `letter-spacing` CSS property
  - Fix a bug where Safari autocomplete would mangle credit card
    input
- PayPal
  - Return a `MERCHANT` error when `tokenize` is called outside of a
    user action event
  - Show loading indicator in popup when a successful authorization
    is being processed and tokenized

## 3.5.0 (2016-10-13)

- Hosted Fields
  - Add dropdown support for expiration month and expiration year

## 3.4.0 (2016-10-10)

- Client
  - More helpful error when a client token is generated with
    insufficient privileges
- Hosted Fields
  - Fix a bug where IE9 inputs would stutter when formatting
  - Enable input formatting on Android
- Apple Pay
  - Add support for Apple Pay integrations that are web-only
- UnionPay
  - Return a proper error when calling some functions without
    callbacks

## 3.3.0 (2016-09-21)

- The `index.js` and `debug.js` files are now full `braintree-web`
  bundles and can be safely loaded in non-CommonJS environments
- Hosted Fields
  - Add input formatting to browsers on iOS
  - Maestro cards beginning with `6` are now correctly identified
- Data Collector
  - Use custom build of
    [SJCL](https://bitwiseshiftleft.github.io/sjcl/) to reduce file
    size

## 3.2.0 (2016-09-14)

- Hosted Fields
  - Add `type` property for field configuration to allow things such
    as `type: "password"` for input masking of particular fields
  - For browsers that support it, the `month` input type can be used
    for `expirationDate`
  - Fix a bug where unformatted `expirationDate` inputs would fail
    validation if user typed in a space, hyphen or slash
- PayPal
  - Utility iframes are now annotated with the
    `braintree-dispatch-frame` class to assist with CSS targeting

## 3.1.0 (2016-09-07)

- PayPal
  - Add focus handle to tokenize method
  - Move a utility iframe far out of view with `position: absolute`

**BREAKING CHANGES**

- Apple Pay
  - Fix a bug with tokenization parameters—no more workaround
    required

## 3.0.2 (2016-08-30)

- Client
  - Provide better error messaging when actions that require a
    client token are attempted with a tokenization key
- Hosted Fields
  - Pass back client error when attempting to vault with an invalid
    authorization
- UnionPay
  - Pass back client error when attempting to vault with an invalid
    authorization
  - Remove vault option from tokenization
- Apple Pay
  - Add `merchantIdentifier` property for use with
    `ApplePaySession.canMakePaymentsWithActiveCard`
  - Fix a bug where `decoratePaymentRequest` (now called
    `createPaymentRequest`) failed to set `merchantCapabilities`.
    The default is now `['supports3DS']`, which is the most commonly
    used value.

**BREAKING CHANGES**

- Apple Pay
  - `decoratePaymentRequest` has been renamed to
    `createPaymentRequest`. This method returns a new object and
    does not mutate the argument
  - Return better error messages when Apple Pay merchant domain
    validation fails
  - The error code `APPLE_PAY_MERCHANT_VALIDATION` has been replaced
    with `APPLE_PAY_MERCHANT_VALIDATION_FAILED` and
    `APPLE_PAY_MERCHANT_VALIDATION_NETWORK`

## 3.0.1 (2016-08-16)

- PayPal
  - Fix a bug where vault flows that used a tokenization key could
    not tokenize

## 3.0.0 (2016-08-10)

- Add prefix to `BraintreeError` codes to prevent namespace collisions
- PayPal
  - Return a `PAYPAL_POPUP_CLOSED` error code when the customer
    closes the popup
  - Return a `PAYPAL_INVALID_PAYMENT_OPTION` error code when PayPal
    options are invalid
  - Fix a bug where some locale codes were not accepted
  - Fix bug where JPY could not be used as PayPal currency
  - vault flows will automatically vault PayPal accounts if client
    token was generated with a customer id
- Hosted Fields
  - Automatic input formatting disabled for iOS and Android
- Apple Pay
  - Use error codes
- Some wrapped errors were inconsistently placed under the
  `err.details` property; they are now under
  `err.details.originalError`
- Client
  - Errors are now always instances of BraintreeError
- UnionPay
  - Add `vault` as an option to `tokenize` which allows cards to be
    vaulted on tokenization

## 3.0.0-beta.12

- Some error messages have been changed to be more consistent across
  components

- Update `BraintreeError` to include a `code`, which can be used to
  check for specific errors:

      hostedFieldsInstance.tokenize(function (err, payload) {
        if (err && err.code === 'FIELDS_EMPTY') {
          // Handle user input error
        }
      });

- Fix an incorrect `<script>` tag example in API docs

- Fix an error in Require.js API docs

- Hosted Fields
  - Automatic input formatting disabled for Android Firefox
  - Add `vault` as an option to `tokenize` which allows cards to be
    vaulted on tokenization
  - Add `addClass` and `removeClass` for updating classes on fields
  - Stop applying `invalid` CSS classes to `potentiallyValid` fields
    on tokenization attempts

- PayPal
  - Consistently return `BraintreeError` objects when the PayPal
    flow is canceled
  - Return error during `create` when using a webview

- UnionPay
  - Add `type` to tokenize payload

- Add Apple Pay component.

## 3.0.0-beta.11

- Update create error messages to be more consistent
- Add `type` to Hosted Fields and PayPal tokenize payloads
- Hosted Fields
  - Add `getState` method that returns the state of all fields and
    possible card types
  - Fixes a regression where expiration dates with a past month
    within the current year were treated as valid
- PayPal
  - Add `useraction` option to `paypal.tokenize`

**BREAKING CHANGES**

- UnionPay improvements.
  - Card capabilities
    - Renamed `isUnionPayEnrollmentRequired` to `isSupported`.
    - When `isSupported` is false, Braintree cannot process
      UnionPay card. Customer would need to use a different card.
  - Enrollment response has `smsCodeRequired` flag.
    - If `true`, customer will receive an SMS code, that is
      required for tokenization.
    - If `false`, SMS code should not be passed during
      tokenization. Tokenization can be done immediately.

## 3.0.0-beta.10

- Return a human readable error message when requests are
  rate-limited.
- Add 3D Secure component.
- Hosted Fields
  - Throw an error when initializing with an invalid field key. See
    **BREAKING CHANGES**.
  - The formatting for expiration dates no longer inserts a leading
    `0` if the date begins with `1`. This prevents the numbers from
    jumping around for dates beginning `01`, `10`, `11`, or `12`.

**BREAKING CHANGES**

- An error is now returned when initializing Hosted Fields with an
  invalid field; it is no longer silently ignored.

## 3.0.0-beta.9

- No longer throws exceptions when using `require('braintree-web')`
  during server-side rendering with libraries such as React.js.
- `index.js` and `debug.js` in the npm/bower modules no longer
  reference `package.json`.
- Ajax errors in IE9 now report as general error instead of an empty
  string. It is impossible to get details additional about network
  errors in IE9 XDomainRequests.
- Add 3D Secure component
- UnionPay
  - Expiration date or month/year together are now optional as some
    UnionPay cards do not have expiration dates.
- PayPal
  - All `create` options aside from `client` have now moved to
    `tokenize`. See **BREAKING CHANGES**.
  - For one-time checkout, add `intent` option which can be `sale`
    or `authorize`
  - HTTPS is no longer required
  - Add `offerCredit` as an option to `tokenize` for offering
    customers PayPal Credit as a form of payment

**BREAKING CHANGES**

- PayPal's `create` options have moved to `tokenize`. Deferring these
  options to tokenization time allows greater flexibility in your
  checkout experience.

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

## 3.0.0-beta.8

- Hosted Fields
  - Update `card-validator` to `2.2.8`
  - Throw a proper error when creating without a callback
- UnionPay
  - Fix tokenization bugs
- Data Collector
  - Throw a proper error when creating without a callback
- Improved error messaging when two components' versions do not match
  one another.

**BREAKING CHANGES**

- Data Collector
  - The `create` API has changed. `options.kount` for
    `dataCollector.create` is now a simple boolean:

        dataCollector.create({
          client: clientInstance,
          kount: true,
          paypal: true
        }, function (err, collector) {});

## 3.0.0-beta.7

- Hosted Fields
  - Add `inputSubmitRequest` event which is called when the user
    presses the Enter key (or equivalent) in a Hosted Fields input.

**BREAKING CHANGES**

- Make all callbacks consistently called asynchronously
- Hosted Fields
  - The `fieldStateChange` event is now 4 events: `empty`,
    `notEmpty`, `validityChange`, and `cardTypeChange`
  - Change event payloads to always return the full state of the
    form and all possible card types
- Data Collector
  - A `client` option is now required

## 3.0.0-beta.6

- Hosted Fields
  - `postalCode` field now has a maximum length of 10 characters
  - Fix issues when pasting into fields
- UnionPay
  - Added support for UnionPay and Hosted Fields
  - Updated the API
  - Added `teardown` to cleanly destroy a UnionPay instance
- PayPal
  - Add support for `billingAgreementDescription`

**BREAKING CHANGES**

- UnionPay
  - `fetchCapabilities` now takes `card: {number: '4111'}` instead
    of `cardNumber: '4111'`
  - `enroll` now takes mobile phone data under the `mobile` property
    instead of the `card` property
  - `enroll` now returns a property called `enrollmentId` instead of
    `unionpayEnrollmentId`
  - Removed the `options.options` property from `tokenize`;
    `smsCode` and `enrollmentId` are now top-level options

## 3.0.0-beta.5

- Improve documentation of callbacks
- Hosted Fields
  - Calling methods (such as `tokenize` or `setPlaceholder`) after
    Hosted Fields has been torn down throws an error
- PayPal
  - Calling methods (such as `tokenize`) after PayPal has been torn
    down throws an error
- DataCollector
  - Throw an error when trying to tear down twice
- American Express
  - `getRewardsBalance` to get the rewards balance of a Braintree
    nonce
  - `getExpressCheckoutProfile` to get the Express Checkout profile
    of an Amex nonce
- UnionPay
  - `fetchCapabilities` to fetch card capabilities, and determine if
    a card requires enrollment
  - `enroll` to process enrollment for a card
  - `tokenize` UnionPay cards

## 3.0.0-beta.4

- Client
  - `client` components no longer have a `teardown` function
- Hosted Fields
  - Add `setPlaceholder` to allow dynamic updating of field
    placeholders
  - Client component version must match Hosted Fields' component
    version
  - Throw `BraintreeError` if tokenize does not include a callback
- PayPal
  - Bugfixes in teardown
  - Client component version must match PayPal's component version
  - Make teardown callback optional
  - Throw `BraintreeError` if tokenize does not include a callback

## 3.0.0-beta.3

- npm packaging fixes

## 3.0.0-beta.2

- Hosted Fields
  - Allow expiration dates with leading zeroes when formatting is
    enabled
- PayPal
  - Bugfixes

**BREAKING CHANGES**

- PayPal
  - Replace `shippingAddressOverride.editable` with
    `shippingAddressEditable`, which disables user editing of
    shipping address when set to false.
  - Replace `singleUse` boolean property with `flow` string
    property. `singleUse: true` is now `flow: 'checkout'`. `flow` is
    required; use `flow: 'vault'` for Vault flow.

| Old                 | New                |
| ------------------- | ------------------ |
| `singleUse` omitted | `flow: 'vault'`    |
| `singleUse: false`  | `flow: 'vault'`    |
| `singleUse: true`   | `flow: 'checkout'` |

## 3.0.0-beta.1

This release contains a number of new features for developers and their
users, the key benefits are listed below. This is a significant
departure from our earlier versions of the JS SDK. It is a composable
SDK instead of a collection of pre-defined integration patterns (better
for more advanced developers):

- Smaller File Size

  > Results in faster load times and improves performance of their web
  > applications. A merchant has the choice to control the size by
  > controlling the components they use. To illustrate the
  > implications of this: a merchant who is only using PayPal does not
  > need to include (and subsequently force their users to download)
  > the code for Hosted Fields, DataCollector, etc. if they are not
  > leveraging these features.

- Modular Architecture for Advanced Developers

  > Rebuilt with a module-first approach. Developers have the choice
  > and control over the specific JS SDK components they’d like to use
  > instead of using the full SDK. The value of this is that it
  > results in a simpler integration and also has been something many
  > advanced developers have requested.

- Custom PayPal Button

  > Developers have the option to customize the PayPal button that is
  > displayed on their page. We provide only a bindable programmatic
  > handler.

- Hosted Fields Formatting

  > Many developers who use Hosted Fields have asked us for more
  > robust abilities to format input into the Hosted Fields Form
  > Fields for UX reasons. The new SDK allows fields to be formatted.
  > One example of this is clean spacing between card numbers (4111
  > 1111 1111 1111 instead of 4111111111111111).

- No Dependency on Form Submissions

  > Traditionally, our SDK has required developers to submit payment
  > information in the context of a form. We no longer require
  > developers to integrate with this pattern. Modern web applications
  > tend to be built with richer client-side functionality
  > (validation, multiple payment options, AJAX submission, etc.).
  > Deferring the mechanics of tokenization to a simple API call in
  > our SDK allows our libraries to be much less intrusive as far as
  > developer experience goes.

- CORS Support, as opposed to JSONP

  > CORS is a Web Security technology that allows developers tight
  > control over which third party services can be rendered within
  > their web page. This is now the default.

- Improved .NET Experience

  > .NET developers who use the WebForms Technology have run into many
  > issues with previous versions of our SDK related to competing form
  > submission handling. Since we no longer rely on form submissions,
  > native .NET form handling is left untouched.

- Improved Documentation

  > By its very nature, this new release is more low-level and less
  > opinionated about contextual integration. This means we can
  > provide an API reference and simpler getting started guides.

- Modern distribution

  > By focusing on npm and GitHub as release channels the SDK fits
  > better with newer build pipelines and tooling.

- Improved error messaging

  > Better error handling and presentation everywhere, with clearer
  > error messaging.
