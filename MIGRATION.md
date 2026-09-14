# Braintree Web SDK Migration Guide

Use this document as a reference to upgrade your Braintree Web (JavaScript) SDK integration. The migration guide details what has changed between versions and provides an upgrade path where possible. See the [CHANGELOG.md](/CHANGELOG.md) for a complete list of the changes.

## Table of Contents

- [Introduction](#introduction)
- [Upgrading from Web SDK v3.x to v4](#upgrading-from-web-sdk-v3x-to-v4)
- [Upgrading from Web SDK v2.x to v3](#upgrading-from-web-sdk-v2x-to-v3)

## Introduction

This document is the reference for upgrading your Braintree Web (JavaScript) SDK integration across major versions. Each major-version upgrade has its own section and this guide complements, but does not replace, the [CHANGELOG.md](CHANGELOG.md).

Each version section is typically organized as SDK-wide **General** changes that apply across all components, followed by per-component sections. Where a section provides an "At a glance" table, use it to jump straight to the components your integration uses.

### Before you begin

- **We follow semver.** Only major versions contain breaking changes; minor and patch releases are backward compatible. Read the **General** changes for your target version first, then the sections for the components you use.
- **Upgrade one major version at a time.** If your integration is several major versions behind, step through each upgrade in order rather than jumping straight to the latest.
- **Watch for silent behavior changes.** Not every breaking change throws. Removed properties can read as `undefined`, value and enum casing can change, and defaults can change. Audit comparisons, property reads, and any options you relied on defaulting.

### References

- [CHANGELOG.md](CHANGELOG.md) — the complete list of changes for each release.
- [JSDoc reference](https://braintree.github.io/braintree-web/current/) — API-level documentation for every component.
- [Developer guides](https://developer.paypal.com/braintree/docs/guides/overview/) — setup and integration guides.

## Upgrading from Web SDK v3.x to v4

Please read the following guide carefully. The changes in [**General**](#general) apply across all components. Changes to individual components are listed in individual sections.

Highlights:

- **Callback support removed.** Every `create()` method and asynchronous instance method now returns a `Promise` only. See [Callback Support Removed](#callback-support-removed).
- **ES2017 required.** The SDK is compiled to ES2017; Internet Explorer and other pre-ES2017 environments are no longer supported. See [Build output and tooling](#build-output-and-tooling).
- **Deprecated components removed.** PayPal V4 (use [PayPal Checkout V6](#paypal-checkout-v6-paypal-checkout-v6)), [Masterpass](#masterpass-masterpass), [Payment Request](#payment-request-payment-request), and [Visa Checkout](#visa-checkout-visa-checkout) have been removed.
- **Google Pay defaults to v2.** API v1 is removed; integrations that omitted `googlePayVersion` are now on v2. See [Google Pay](#google-pay-google-payment).
- **Venmo requires `paymentMethodUsage`** (and `totalAmount` for `single_use`). See [Venmo](#venmo-venmo).

### At a glance

Use this table to jump to the components your integration uses.

| Component                                                          | Status           | Summary                                                                                  |
| ------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| [3D Secure](#3dsecure-three-d-secure)                              | Changes required | 3D Secure v2-only; renamed options, event signatures, error codes                        |
| [ACH Direct Debit](#ach-direct-debit-us-bank-account)              | Changes required | Plaid `bankLogin` flow and error codes removed                                           |
| [American Express](#american-express-american-express)             | —                |                                                                                          |
| [Apple Pay](#apple-pay-apple-pay)                                  | —                |                                                                                          |
| [Client](#client-client)                                           | Changes required | GraphQL-native config shape and error codes                                              |
| [Data Collector](#data-collector-data-collector)                   | Changes required | Deprecated `create()` options and error codes removed                                    |
| [Fastlane](#fastlane-fastlane)                                     | —                |                                                                                          |
| [Google Pay](#google-pay-google-payment)                           | Changes required | API v1 removed; defaults to v2                                                           |
| [Hosted Fields](#hosted-fields-hosted-fields)                      | Changes required | `selector`, `rejectUnsupportedCards`, `setPlaceholder()` removed; Mastercard type string |
| [Instant Verification](#instant-verification-instant-verification) | —                |                                                                                          |
| [Local Payment Methods](#local-payment-methods-local-payment)      | —                |                                                                                          |
| [Masterpass](#masterpass-masterpass)                               | Removed          | Component removed; no replacement                                                        |
| [Payment Request](#payment-request-payment-request)                | Removed          | Component removed; no replacement                                                        |
| [PayPal](#paypal-paypal)                                           | Removed          | Use PayPal Checkout V6 instead                                                           |
| [PayPal Checkout V5](#paypal-checkout-v5-paypal-checkout)          | Changes required | `pageType` required; `intent`/`autoSetDataUserIdToken` defaults changed                  |
| [PayPal Checkout V6](#paypal-checkout-v6-paypal-checkout-v6)       | Changes required | `isSupported()` removed                                                                  |
| [SEPA Direct Debit](#sepa-direct-debit-sepa)                       | —                |                                                                                          |
| [Vault Manager](#vault-manager-vault-manager)                      | —                |                                                                                          |
| [Venmo](#venmo-venmo)                                              | Changes required | `paymentMethodUsage`/`totalAmount` required; hash inspection, `@` prefix removed         |
| [Visa Checkout](#visa-checkout-visa-checkout)                      | Removed          | Component removed; no replacement                                                        |

### General

#### Build output and tooling

The SDK is now compiled to **ES2017** instead of ES5, for both the CDN bundles and the npm distribution. Browsers running your integration must support ES2017. If you must support environments that predate ES2017, transpile and polyfill `braintree-web` as part of your own build.

Building the SDK from source now requires **Node.js `>=20`**. This affects build and development tooling only; it does not change the browser runtime your integration ships to.

#### Callback Support Removed

Previously, all components supported both a legacy Node-style callback interface and a Promise-style interface. Every `create()` method and every asynchronous instance method now **only** returns a `Promise`.

If you already use `.then()`/`.catch()` or `await`, the return type is unchanged. All asynchronous methods still return a `Promise` with the same resolved-value and rejected-error shapes. You do **not** need to convert existing Promise-based call sites to `async`/`await`. The only required change is removing Node-style callbacks: switch any callback call site to `async`/`await` (with `try`/`catch`) or `.then()`/`.catch()`.

> **Important:** Callback removal is silent. A trailing `(err, result)` callback is not rejected or warned about — it is simply ignored, and the returned `Promise` is never observed, so the callback never fires and dependent code hangs forever. Because nothing surfaces at build time, you must audit **every** asynchronous call site to confirm none still pass a callback, even if you believe your integration is already fully Promise-based.

The examples below use `async`/`await`, the recommended style. The same transformation applies to every `create()` method and every asynchronous instance method across all components.

##### `create()` with an options object

**Before (v3.x):**

```javascript
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (clientErr, clientInstance) {
    if (clientErr) {
      console.error("Error creating client instance", clientErr);
      return;
    }

    // set up other components
  }
);
```

**After (v4.x):**

```javascript
try {
  const clientInstance = await braintree.client.create({
    authorization: CLIENT_AUTHORIZATION,
  });

  // set up other components
} catch (clientErr) {
  console.error("Error creating client instance", clientErr);
}
```

##### Instance method returning a payload (callable with no arguments)

**Before (v3.x):**

```javascript
hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
  if (tokenizeErr) {
    console.error("Tokenization failed", tokenizeErr);
    return;
  }

  console.log("Got nonce:", payload.nonce);
});
```

**After (v4.x):**

```javascript
try {
  const payload = await hostedFieldsInstance.tokenize();

  console.log("Got nonce:", payload.nonce);
} catch (tokenizeErr) {
  console.error("Tokenization failed", tokenizeErr);
}
```

##### Instance method with options and a payload

**Before (v3.x):**

```javascript
threeDSecure.verifyCard(
  {
    amount: "100.00",
    nonce: nonceFromTokenizationPayload,
    bin: binFromTokenizationPayload,
  },
  function (verifyErr, payload) {
    if (verifyErr) {
      console.error("Verification failed", verifyErr);
      return;
    }

    submitNonceToServer(payload.nonce);
  }
);
```

**After (v4.x):**

```javascript
try {
  const payload = await threeDSecure.verifyCard({
    amount: "100.00",
    nonce: nonceFromTokenizationPayload,
    bin: binFromTokenizationPayload,
  });

  submitNonceToServer(payload.nonce);
} catch (verifyErr) {
  console.error("Verification failed", verifyErr);
}
```

##### `teardown()` (no payload)

**Before (v3.x):**

```javascript
instance.teardown(function (teardownErr) {
  if (teardownErr) {
    console.error("Could not tear down instance", teardownErr);
    return;
  }

  // teardown complete
});
```

**After (v4.x):**

```javascript
try {
  await instance.teardown();

  // teardown complete
} catch (teardownErr) {
  console.error("Could not tear down instance", teardownErr);
}
```

##### Prefer `.then()`/`.catch()`?

If you aren't using `async`/`await`, the same methods can be consumed as plain Promises — the callback is simply dropped and the result/error move to `.then()`/`.catch()`:

```javascript
braintree.client
  .create({
    authorization: CLIENT_AUTHORIZATION,
  })
  .then(function (clientInstance) {
    // set up other components
  })
  .catch(function (clientErr) {
    console.error("Error creating client instance", clientErr);
  });
```

### 3DSecure (`three-d-secure`)

#### 3D Secure 2 is the only supported version

3D Secure v1 is removed; the component always uses v2. The `version` option and the `2-bootstrap3-modal` integration are removed. Use the new `challengeDisplay` option to control how the challenge is presented.

```diff
  braintree.threeDSecure.create({
    client: clientInstance,
-   version: '2'
+   challengeDisplay: 'modal'
  });
```

| v3.x `version`         | v4.x `challengeDisplay`                                         |
| ---------------------- | --------------------------------------------------------------- |
| `'2'`                  | `'modal'`                                                       |
| `'2-inline-iframe'`    | `'inline-iframe'`                                               |
| `'2-bootstrap3-modal'` | Removed (Bootstrap 3 modal no longer supported); use `'modal'`. |

#### Renamed `verifyCard` options

```diff
  threeDSecure.verifyCard({
    amount: '100.00',
    nonce: nonceFromTokenizationPayload,
    bin: binFromTokenizationPayload,
-   exemptionRequested: true,
-   cardAdd: true
+   requestedExemptionType: 'low_value',
+   cardAddChallengeRequested: true
  });
```

`requestedExemptionType` takes a string (`'low_value'` or `'transaction_risk_analysis'`), not a boolean.

#### Event handler signatures changed

The `lookup-complete` and `authentication-iframe-available` handlers now receive a single `payload` object instead of separate arguments. Read the data off `payload` and call `payload.next()`.

```diff
- threeDSecure.on('lookup-complete', function (data, next) {
-   console.log(data);
-   next();
+ threeDSecure.on('lookup-complete', function (payload) {
+   console.log(payload.data);
+   payload.next();
  });

- threeDSecure.on('authentication-iframe-available', function (event, next) {
-   document.body.appendChild(event.element);
-   next();
+ threeDSecure.on('authentication-iframe-available', function (payload) {
+   document.body.appendChild(payload.element);
+   payload.next();
  });
```

#### Top-level `liabilityShifted` and `liabilityShiftPossible` removed

These properties are removed from the `verifyCard` and `cancelVerifyCard` payloads. Read them from the nested `threeDSecureInfo` object instead.

```diff
- payload.liabilityShifted;
- payload.liabilityShiftPossible;
+ payload.threeDSecureInfo.liabilityShifted;
+ payload.threeDSecureInfo.liabilityShiftPossible;
```

The nested properties are always booleans, defaulting to `false` when the gateway returns no liability-shift data.

> **Important:** Reading the removed top-level properties no longer throws — it returns `undefined` (falsy). A check like `if (payload.liabilityShifted)` will silently behave as though liability never shifted. Audit every reference and update it to read from `payload.threeDSecureInfo`.

#### Error code changes

| v3.x code                      | v4.x code                           | What changed                                                                                                                        |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `THREEDS_UNRECOGNIZED_VERSION` | `THREEDS_CHALLENGE_DISPLAY_INVALID` | Different error. The `version` option was replaced by `challengeDisplay`, so this now fires on an invalid `challengeDisplay` value. |
| `THREEDS_UNSUPPORTED_VERSION`  | — (removed)                         | No replacement; 3D Secure v1 is gone.                                                                                               |

If your integration branches on these error codes, update the references.

### ACH Direct Debit (`us-bank-account`)

#### Plaid bank login flow removed

The non-functional Plaid `bankLogin` flow and its error codes have been removed; `tokenize()` now supports only the `bankDetails` flow. Calls that still pass `bankLogin` reject with `US_BANK_ACCOUNT_OPTION_REQUIRED` (`"tokenize must be called with bankDetails."`).

#### Error code changes

The following error codes were removed along with the Plaid bank login flow. None have a replacement.

| v3.x code                                    | v4.x code   |
| -------------------------------------------- | ----------- |
| `US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS` | — (removed) |
| `US_BANK_ACCOUNT_LOGIN_LOAD_FAILED`          | — (removed) |
| `US_BANK_ACCOUNT_LOGIN_CLOSED`               | — (removed) |
| `US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE`       | — (removed) |
| `US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED`     | — (removed) |

If your integration branches on these error codes, update the references.

### American Express (`american-express`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Apple Pay (`apple-pay`)

No breaking API changes. The SDK-wide changes in [General](#general) apply.

#### Apple Pay JS SDK is now loaded automatically

`applePay.create()` now injects Apple's Apple Pay JS SDK (`https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js`). This enables Apple Pay in non-Safari browsers (Chrome/Edge/Firefox) and across devices (QR code).

What this means for your integration:

- **No code change required.**
- **Remove any manual script tag** you previously added for non-Safari support.
- **Update your Content Security Policy:**

  ```csp
  img-src https://applepay.cdn-apple.com;
  frame-src https://applepay.cdn-apple.com;
  script-src https://applepay.cdn-apple.com;
  ```

- **To keep the pre-v4 behavior**, pass `loadApplePaySDK: false` to `applePay.create()`. The SDK will not be injected (so the CSP directives above are unnecessary), Safari continues to use its native `window.ApplePaySession`, and you must add the script yourself for non-Safari support.

  ```js
  braintree.applePay.create({
    client: clientInstance,
    loadApplePaySDK: false,
  });
  ```

- **To pin a specific SDK version**, use the same opt-out: pass `loadApplePaySDK: false` and add your own `<script>` tag pointing at a pinned version (e.g. `https://applepay.cdn-apple.com/jsapi/v1.3.8/apple-pay-sdk.js`). Apple recommends the auto-updating `1.latest` build unless you have a specific compatibility requirement.

### Client (`client`)

The SDK is now GraphQL-native. The configuration returned by `getConfiguration().gatewayConfiguration` now matches the native GraphQL shape: several properties were renamed or restructured, and values use native GraphQL casing.

#### Configuration shape changes

Most integrations are unaffected: `getConfiguration()` is public mainly so other Braintree components can configure themselves, and most merchants never read `gatewayConfiguration` directly. This section only applies if yours does.

```diff
  const { gatewayConfiguration } = clientInstance.getConfiguration();

- gatewayConfiguration.androidPay.googleAuthorizationFingerprint;
- gatewayConfiguration.androidPay.supportedNetworks;
+ gatewayConfiguration.googlePay.googleAuthorization;
+ gatewayConfiguration.googlePay.supportedCardBrands;

- gatewayConfiguration.payWithVenmo;
+ gatewayConfiguration.venmo;

- gatewayConfiguration.challenges;
- gatewayConfiguration.creditCards.supportedCardTypes;
+ gatewayConfiguration.creditCard.challenges;
+ gatewayConfiguration.creditCard.supportedCardBrands;

- gatewayConfiguration.threeDSecureEnabled;
- gatewayConfiguration.threeDSecure;
+ gatewayConfiguration.creditCard.threeDSecureEnabled;
+ gatewayConfiguration.creditCard.threeDSecure;

- gatewayConfiguration.applePayWeb.supportedNetworks;
+ gatewayConfiguration.applePayWeb.supportedCardBrands;

- gatewayConfiguration.paypal.currencyIsoCode;
+ gatewayConfiguration.paypal.currencyCode;
```

> **Important:** Values are now native GraphQL enums. Card brands are uppercase (`"visa"` → `"VISA"`, `"MasterCard"` → `"MASTERCARD"`) and `environment` is uppercase (`"sandbox"` → `"SANDBOX"`). Equality checks or `switch` statements against the old lowercase or display-name values silently stop matching — audit every comparison against these values.

#### Synthetic `paypalEnabled` removed

The synthetic `paypalEnabled` property is removed. Detect whether PayPal is enabled by checking for the presence of the `paypal` object instead.

```diff
- if (gatewayConfiguration.paypalEnabled) {
+ if (gatewayConfiguration.paypal) {
    // PayPal is enabled
  }
```

#### GraphQL request error codes

The SDK is now GraphQL-native and classifies every GraphQL response — both the initial `client.create()` configuration fetch and merchant-facing `client.request({ api: "graphQLApi" })` calls — through a single, consistent error classifier.

Previously, a GraphQL request that came back with an HTTP 200 error body was flattened to a single `CLIENT_GRAPHQL_REQUEST_ERROR`, and the configuration fetch mapped everything except authentication/authorization failures to `CLIENT_GATEWAY_NETWORK`. Errors are now classified by HTTP status first, then by the GraphQL `errorClass` on an HTTP 200 error body:

| Failure                                    | Resulting `error.code`              |
| ------------------------------------------ | ----------------------------------- |
| HTTP 401, or `errorClass: AUTHENTICATION`  | `CLIENT_AUTHORIZATION_INVALID`      |
| HTTP 403, or `errorClass: AUTHORIZATION`   | `CLIENT_AUTHORIZATION_INSUFFICIENT` |
| HTTP 429                                   | `CLIENT_RATE_LIMITED`               |
| `errorClass: VALIDATION`                   | `CLIENT_REQUEST_ERROR`              |
| HTTP 5xx / network failure                 | `CLIENT_GATEWAY_NETWORK`            |
| HTTP 200 error body, unknown/no errorClass | `CLIENT_GRAPHQL_REQUEST_ERROR`      |

The raw GraphQL `errors` array is still available on `error.details.originalError`, so integrations that inspect the original error (for example, reading `originalError[0].extensions.errorClass` or a `legacyCode`) are unaffected.

If your integration branches on `error.code` for GraphQL requests, audit those checks: auth and validation failures that previously surfaced as `CLIENT_GRAPHQL_REQUEST_ERROR` (or, for the configuration fetch, `CLIENT_GATEWAY_NETWORK`) now surface as the more specific codes above.

### Data Collector (`data-collector`)

#### Deprecated `create()` options removed

The deprecated `paypal`, `clientMetadataId`, and `correlationId` options have been removed from `dataCollector.create()`. The `create()` options now expose only the current `riskCorrelationId` parameter for setting a custom risk correlation id.

- `paypal` — Removed. This option was a no-op; PayPal fraud data is collected automatically when the Data Collector instance is created. Remove it from your `create()` call.
- `clientMetadataId` — Removed. Use `riskCorrelationId` instead.
- `correlationId` — Removed. Use `riskCorrelationId` instead.

**Before (v3.x):**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  paypal: true,
  clientMetadataId: "custom-session-id-123",
  // or correlationId: "custom-session-id-123"
});
```

**After (v4.x):**

```javascript
braintree.dataCollector.create({
  client: clientInstance,
  riskCorrelationId: "custom-session-id-123",
});
```

#### Error code changes

`DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS` was not renamed — it was removed, and a separate `DATA_COLLECTOR_FAILED_TO_INSTANTIATE` code was added for a different condition.

| v3.x code                                | v4.x code                              | What changed                                                 |
| ---------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS` | — (removed)                            | Previously fired on missing create options (`MERCHANT`).     |
| —                                        | `DATA_COLLECTOR_FAILED_TO_INSTANTIATE` | New code. Fires when Fraudnet cannot be enabled (`NETWORK`). |

If your integration branches on these error codes, update the references.

### Fastlane (`fastlane`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Google Pay (`google-payment`)

#### Google Pay API v1 removed

Google Pay API v1 is removed. The component always uses API v2. The `googlePayVersion` option is removed. Remove it from your `create()` call.

> **Important:** The default changed from v1 to v2. Integrations that omitted `googlePayVersion` were previously on v1 and are now on v2.

```diff
  braintree.googlePayment.create({
    client: clientInstance,
-   googlePayVersion: 2,
    googleMerchantId: "your-merchant-id-from-google",
  });
```

### Hosted Fields (`hosted-fields`)

#### `field.selector` removed

The deprecated `field.selector` option has been removed. Rename it to `field.container`, which accepts the same values — a CSS selector string or a DOM node.

```diff
  braintree.hostedFields.create({
    client: clientInstance,
    fields: {
      number: {
-       selector: "#card-number",
+       container: "#card-number",
      },
    },
  });
```

Passing `field.selector` now throws `HOSTED_FIELDS_INVALID_FIELD_SELECTOR`; previously it was silently accepted as an alias.

#### `field.rejectUnsupportedCards` removed

The `rejectUnsupportedCards` option is removed. Unsupported card brands are now **rejected by default**. To customize which brands are accepted, use the `number` field's `supportedCardBrands` option, an object mapping brand id to a boolean.

```diff
  braintree.hostedFields.create({
    client: clientInstance,
    fields: {
      number: {
        container: "#card-number",
-       rejectUnsupportedCards: true,
+       supportedCardBrands: {
+         visa: false, // disable an otherwise-supported brand
+       },
      },
    },
  });
```

Valid brand ids include `visa`, `mastercard`, `american-express`, and others — see the [`supportedCardBrands` JSDoc](https://braintree.github.io/braintree-web/current/module-braintree-web_hosted-fields.html) for the full list.

#### `setPlaceholder()` removed

The `setPlaceholder()` method is removed. Use `setAttribute()` instead.

```diff
- hostedFieldsInstance.setPlaceholder("number", "1111 1111 1111 1111");
+ hostedFieldsInstance.setAttribute({
+   field: "number",
+   attribute: "placeholder",
+   value: "1111 1111 1111 1111",
+ });
```

#### Mastercard card type string

The card `type` value for Mastercard changed from `master-card` to `mastercard`. This value is used in the `cardTypeChange` event payload, the `validityChange` event payload, and in `getState().cards[]`.

```diff
  hostedFieldsInstance.on("cardTypeChange", function (event) {
-   if (event.cards[0].type === "master-card") {
+   if (event.cards[0].type === "mastercard") {
      // show the Mastercard logo
    }
  });
```

### Instant Verification (`instant-verification`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Local Payment Methods (`local-payment`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Masterpass (`masterpass`)

The deprecated Masterpass component (`masterpass`) has been removed. There is no replacement.

### Payment Request (`payment-request`)

The deprecated Payment Request component (`payment-request`) has been removed. There is no replacement.

### PayPal (`paypal`)

The deprecated PayPal V4 component (`braintree-web/paypal`) has been removed. Use [PayPal Checkout V6](#paypal-checkout-v6-paypal-checkout-v6) instead.

### PayPal Checkout V5 (`paypal-checkout`)

#### `pageType` required in `loadPayPalSDK()`

The `pageType` option is now **required** when calling `loadPayPalSDK()`. It is sent as the `data-page-type` attribute on the PayPal SDK script tag so PayPal can accurately log interactions with the page and component.

```diff
  paypalCheckoutInstance.loadPayPalSDK({
+   pageType: "checkout",
    currency: "USD",
  });
```

`pageType` must be one of the values PayPal's SDK accepts: `product-listing`, `search-results`, `product-details`, `mini-cart`, `cart`, or `checkout`. See [PayPal's `data-page-type` reference](https://developer.paypal.com/sdk/js/v5/configuration#data-page-type).

#### `intent` defaults to `capture`

When `intent` is not explicitly provided, `loadPayPalSDK()` and `createPayment()` now default to `capture` instead of `authorize`, matching the default used by PayPal's own SDK. The vault flow's `intent=tokenize` default in `loadPayPalSDK()` is unaffected.

If you relied on the old `authorize` default, pass `intent: "authorize"` explicitly in both calls:

```diff
  paypalCheckoutInstance.loadPayPalSDK({
    pageType: "checkout",
+   intent: "authorize",
    currency: "USD",
  });

  paypalCheckoutInstance.createPayment({
    flow: "checkout",
+   intent: "authorize",
    amount: "10.00",
    currency: "USD",
  });
```

#### `autoSetDataUserIdToken` enabled by default

`autoSetDataUserIdToken` — which renders the PayPal button pre-populated with a returning customer's vaulted PayPal account — is now **enabled by default**. Previously it required explicit opt-in, so the `autoSetDataUserIdToken: true` option is no longer needed and can be removed.

To opt out of this behavior, you must now explicitly pass `autoSetDataUserIdToken: false`:

```diff
  braintree.paypalCheckout.create({
    client: clientInstance,
-   autoSetDataUserIdToken: true,
+   autoSetDataUserIdToken: false, // only needed to opt out
  });
```

### PayPal Checkout V6 (`paypal-checkout-v6`)

#### `isSupported()` removed

The static `braintree.paypalCheckoutV6.isSupported()` function is removed. The function had been a deprecated no-op that always returned `true`, so remove any calls and the guard around them.

```diff
- if (braintree.paypalCheckoutV6.isSupported()) {
-   // render the PayPal button
- }
+ // render the PayPal button (no eligibility check needed)
```

### SEPA Direct Debit (`sepa`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Vault Manager (`vault-manager`)

No component-specific breaking changes. Only the SDK-wide changes in [General](#general) apply.

### Venmo (`venmo`)

#### `paymentMethodUsage` required

The `paymentMethodUsage` option is now **required** when creating a Venmo instance. Pass either `"single_use"` or `"multi_use"` to indicate how the payment method will be used.

```diff
  braintree.venmo.create({
    client: clientInstance,
+   paymentMethodUsage: "single_use", // or "multi_use"
  });
```

- `"single_use"`: The payment method will be used for a single transaction only.
- `"multi_use"`: The payment method will be vaulted for future transactions.

#### `totalAmount` required for `single_use`

When `paymentMethodUsage` is `"single_use"`, the `totalAmount` option is now **required** and must be a non-empty string (e.g. `"10.00"`). It remains optional for `"multi_use"`.

```diff
  braintree.venmo.create({
    client: clientInstance,
    paymentMethodUsage: "single_use",
+   totalAmount: "10.00",
  });
```

#### URL hash inspection removed

The SDK no longer inspects the URL hash (`venmoSuccess`, `venmoCancel`, `venmoError`) for payment status. Payment status is now determined exclusively through the Payment Context API. The `ignoreHistoryChanges` option has been removed as it is no longer relevant.

#### Username no longer prepended with `@`

The Venmo username returned in the tokenization payload no longer has an `@` symbol prepended by the SDK. The value is passed through as-is from the API, aligning the Web SDK with the iOS and Android SDKs.

```diff
- payload.details.username; // "@keanu"
- payload.details.payerInfo.userName; // "@keanu"
+ payload.details.username; // "keanu"
+ payload.details.payerInfo.userName; // "keanu"
```

#### Error code changes

| v3.x code            | v4.x code                 | What changed                                                                    |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `VENMO_APP_CANCELED` | `VENMO_CUSTOMER_CANCELED` | Consolidated into a single customer-cancel code.                                |
| `VENMO_APP_FAILED`   | `VENMO_CUSTOMER_CANCELED` | Consolidated. A former app-failure condition now surfaces as a customer cancel. |
| `VENMO_CANCELED`     | `VENMO_CUSTOMER_CANCELED` | Consolidated into a single customer-cancel code.                                |

If your integration branches on these error codes, update the references.

**Before (v3.x):**

```javascript
case 'VENMO_APP_CANCELED':
case 'VENMO_CANCELED':
  console.log('User canceled Venmo flow.');
  break;
case 'VENMO_APP_FAILED':
  console.log('Venmo app encountered a problem.');
  break;
```

**After (v4.x):**

```javascript
case 'VENMO_CUSTOMER_CANCELED':
  console.log('User canceled Venmo flow.');
  break;
```

### Visa Checkout (`visa-checkout`)

The deprecated Visa Checkout component (`visa-checkout`) has been removed. There is no replacement.

## Upgrading from Web SDK v2.x to v3

See [Migrating from v2 to v3](https://developer.paypal.com/braintree/docs/guides/client-sdk/migration/javascript/v3#migrating-from-v2-to-v3).
