# Braintree Web Client Reference <span>v@VERSION</span>

<span class="rule"></span>

- [Overview](#overview)
  - [Module Hierarchy](#module-hierarchy)
  - [Callbacks](#callbacks)
  - [Promises](#promises)
- [Browser Support](#browser-support)
  - [Desktop](#browser-support-desktop)
  - [Mobile](#browser-support-mobile)
  - [Webviews](#browser-support-webviews)
- [Teardown](#teardown)
- [Content Security Policy](#content-security-policy)

<span class="rule"></span>

<a id="overview"></a>

## Overview

The Braintree JavaScript SDK is split up into several **modules**. Each module is also represented by a **class** encapsulating the actions that module can perform. In general, each SDK feature is represented by its own standalone module. You can include as many or as few of these modules in your page depending on the Braintree features you will be using.

Each module exports a `create` function which is responsible for returning an instance of that module's class. For instance, the `braintree-web/paypal` module's `create` method will return an instance of the `PayPal` class.

<a id="module-hierarchy"></a>

### Module hierarchy

Many modules of this SDK require an instance of our `Client` for communicating to our servers. In these cases, a single `Client` instance can be used for the creation of several other module instances.

```
braintree.client.create(...) --------> Client ─┐
                         ┌─────────────────────┤
braintree.paypal.create(...) --------> PayPal  │
                               ┌───────────────┘
braintree.hostedFields.create(...) --> HostedFields
```

<a id="callbacks"></a>

### Callbacks

This SDK uses the Node.js callback style, with callbacks passed as the last argument to a function. Callbacks are expected to receive possible errors as the first parameter, and any returned data as the second:

```javascript
braintree.client.create({...}, callback);

function callback(err, clientInstance) { ... }
```

<a id="promises"></a>

### Promises

In addition to callbacks, all asynchronous methods will return a `Promise` if no callback is provided:

```javascript
braintree.client
  .create({
    authorization: CLIENT_AUTHORIZATION,
  })
  .then(function (client) {
    // Create other components
  });
```

<a id="browser-support"></a>

## Browser support

The Braintree JS SDK provides support for numerous browsers and devices. There are, however, caveats with certain integrations and browser combinations.

While `braintree-web` will work in browsers other than the ones below, these represent the platforms against which we actively test. If you have problems with a specific browser or device, contact [our Support team](https://developer.paypal.com/braintree/help).

<a id="browser-support-desktop"></a>

### Desktop

- Chrome latest
- Firefox latest
- Microsoft Edge latest
- Safari 8+

<a id="browser-support-mobile"></a>

### Mobile

#### iOS

- Safari 8+ (9+ for 3D Secure)
- Chrome 48+ (iOS 9+)

#### Android

- Native browser 4.4+
- Chrome
- Firefox
  <a id="browser-support-webviews"></a>

### Webviews and hybrid environments

If you are using PayPal in a mobile webview, we recommend using PopupBridge for [iOS](https://github.com/braintree/popup-bridge-ios) or [Android](https://github.com/braintree/popup-bridge-android) to open the PayPal authentication flow in a mobile browser for improved security.

Additionally, `braintree-web` is neither tested nor developed for hybrid runtimes such as Cordova, PhoneGap, Ionic, React Native, and Electron. While some success may be had in such environments, our SDK is optimized for the browser and its security policies and may not function correctly outside of them.

<a id="teardown"></a>

## Teardown

In certain scenarios you may need to remove your `braintree-web` integration. This is common in single page applications, modal flows, and other situations where state management is a key factor. Any module returned from a `braintree.component.create` call that can be torn down will include a `teardown` function.

Invoking `teardown` will clean up any DOM nodes, event handlers, popups and/or iframes that have been created by the integration. Additionally, `teardown` accepts a callback which you can use to know when it is safe to proceed.

```js
hostedFieldsInstance.teardown(function (err) {
  if (err) {
    console.error("Could not tear down Hosted Fields!");
  } else {
    console.log("Hosted Fields has been torn down!");
  }
});
```

If you happen to call this method while the instance's `teardown` is in progress, you'll receive an error. Once completed, calling any methods on the instance will throw an error.

<a id="content-security-policy"></a>

## Using `braintree-web` with a Content Security Policy (CSP)

[Content Security Policy](https://www.html5rocks.com/en/tutorials/security/content-security-policy/) is a feature of web browsers that mitigates cross-site scripting and other attacks. By limiting the origins of resources that may be loaded on your page, you can maintain tighter control over any potentially malicious code. We recommend considering the implementation of a CSP when available.

### Basic Directives

|             | Sandbox                                                                                                     | Production                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| script-src  | js.braintreegateway.com<br/>assets.braintreegateway.com                                                     | js.braintreegateway.com<br/>assets.braintreegateway.com                                     |
| img-src     | assets.braintreegateway.com<br/>data:                                                                       | assets.braintreegateway.com<br/>data:                                                       |
| child-src   | assets.braintreegateway.com                                                                                 | assets.braintreegateway.com                                                                 |
| frame-src   | assets.braintreegateway.com                                                                                 | assets.braintreegateway.com                                                                 |
| connect-src | api.sandbox.braintreegateway.com<br/>client-analytics.sandbox.braintreegateway.com<br/>\*.braintree-api.com | api.braintreegateway.com<br/>client-analytics.braintreegateway.com<br/>\*.braintree-api.com |

### PayPal Specific Directives

If using the [PayPal Checkout component](module-braintree-web_paypal-checkout.html), include these additional directives:

|            | Sandbox                                                     | Production                                                  |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| script-src | www.paypalobjects.com<br/>\*.paypal.com<br/>'unsafe-inline' | www.paypalobjects.com<br/>\*.paypal.com<br/>'unsafe-inline' |
| style-src  | 'unsafe-inline'                                             | 'unsafe-inline'                                             |
| img-src    | checkout.paypal.com                                         | checkout.paypal.com                                         |
| child-src  | \*.paypal.com                                               | \*.paypal.com                                               |
| frame-src  | \*.paypal.com                                               | \*.paypal.com                                               |

### Google Pay Specific Directives

If using the [Google Pay component](module-braintree-web_google-payment.html), include these additional directives:

|             | Sandbox                                                                                                         | Production                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| script-src  | pay.google.com                                                                                                  | pay.google.com                                                                                                  |
| connect-src | pay.google.com<br/>https://google.com/pay<br/>https://pay.google.com<br/>https://pay.google.com/about/redirect/ | pay.google.com<br/>https://google.com/pay<br/>https://pay.google.com<br/>https://pay.google.com/about/redirect/ |

If Google adds redirects or changes URLs related to the Google Pay component, the domains or URLs in these directives may change.

### 3D Secure Specific Directives

If using the [3D Secure component](module-braintree-web_three-d-secure.html), include these additional directives:

|             | Sandbox                           | Production                    |
| ----------- | --------------------------------- | ----------------------------- |
| script-src  | songbirdstag.cardinalcommerce.com | songbird.cardinalcommerce.com |
| frame-src   | \*                                | \*                            |
| connect-src | \*.cardinalcommerce.com           | \*.cardinalcommerce.com       |
| form-action | \*                                | \*                            |

3D Secure 2 utilizes an iframe implementation that requires the use of the issuing bank's full ACS URL. In contrast to 3D Secure 1, the 3D Secure 2 core framework does not allow masked URLs or redirects. Given that the list of possible ACS URLs changes regularly and varies between issuers and ACS providers, there is not a strict CSP configuration available for 3D Secure 2.

Additionally, 3D Secure 2 includes a data collection flow called "3DS Method" or "Method URL Collection", which also utilizes the ACS URL directly. This process increases authentication success significantly and is considered mandatory by Visa. Blocking this process through a CSP can potentially result in authentication failures and increased friction within the checkout experience.

If maintaining a CSP in an integration that uses 3D Secure, merchants can consider setting `frame-src *` to whitelist all potential ACS URLs that could be utilized during the 3D Secure authentication process.

### Data Collector Specific Directives

If using Kount with the [Data Collector component](DataCollector.html), adhere to the [Kount CSP guide](https://support.kount.com/hc/en-us/articles/360045746311-FAQ-How-is-Content-Security-Policy-CSP-Used-).

For [Braintree Fraud Protection](https://developer.paypal.com/braintree/docs/guides/premium-fraud-management-tools/overview), use these directives:

|            | Sandbox       | Production    |
| ---------- | ------------- | ------------- |
| script-src | \*.paypal.com | \*.paypal.com |
| child-src  | \*.paypal.com | \*.paypal.com |
| frame-src  | \*.paypal.com | \*.paypal.com |

### Executing In-Line Scripts

|                     | Sandbox                                                      | Production                                                   |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| script-src          | 'unsafe-inline'                                              | 'unsafe-inline'                                              |
| (see documentation) | 'sha\_\_-{HASHED_INLINE_SCRIPT}'<br/>'nonce-ONE_TIME-BASE64' | 'sha\_\_-{HASHED_INLINE_SCRIPT}'<br/>'nonce-ONE_TIME-BASE64' |

Allowing execution of any inline script(s) may lead to security vulnerabilities. To restrict the execution of inline scripts to known code, include a [hash-source](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html#hashes) of the inline script(s) in the `script-src` directive or generate an one-time use [nonce-source](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html#nonces) to allow specific `<script>` blocks to execute.

The generation and appropriate use of these hash-source or one-time nonce-source values are specific to your HTML files and/or server setup. See documentation on "content security policy" and "script-src" directive.

#### Example of hash of inline script(s):

```html
<html><head><meta http-equiv="Content-Security-Policy" content="
    Content-Security-Policy: script-src 'unsafe-inline' 'sha256-zVu1jtS1MTItvxLN0tAAAAOAOlDFjjz/oAIlo5KIjMs='
"/><head>
<script>console.log("execution of inline-script")</script>
</html>
```

ℹ Try generating a hash of the contents of the `<script>` tag [here](https://report-uri.com/home/hash).

⚠️ Note that any change to the `<script>` blocks including empty-space changes will change the hash. For example:

```html
<script>
  console.log("execution of inline-script");
</script>
```

Adding empty-space around the content of the `<script>` tags changes the matching hash. As a result, attempts to load the HTML would show the following error (visible in the developer console):

> Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'sha256-zVu1jtS1MTItvxLN0tAAAAOAOlDFjjz/oAIlo5KIjMs=' js.braintreegateway.com assets.braintreegateway.com pay.google.com". Either the 'unsafe-inline' keyword, a hash ('sha256-y5bhUNykMSWsqlMH7ObmFlUgQFkbMBMmFmeQ3H9wltI='), or a nonce ('nonce-...') is required to enable inline execution.

ℹ️ In the example above, the correct hash, `sha256-y5bhUNykMSWsqlMH7ObmFlUgQFkbMBMmFmeQ3H9wltI=`, appears in the last sentence of the error message.

#### Example of nonce-source

```html
<html><head>
  <meta http-equiv="Content-Security-Policy" content="
    Content-Security-Policy: script-src 'unsafe-inline' 'nonce-123a456b789c000d='
"/>
<head>
<script nonce="123a456b789c000d=">console.log("execution of inline-script");</script>
<script nonce="123a456b789c000d=">var sum = 1 + 2;</script>
</html>
```

ℹ️️ nonce-source should be one-time use; that is, it changes for each request.

ℹ️️ nonce-source should be a randomly generated, non-guessable,cryptographically strong value; the standard of whats cryptographical strong continue to evolve, but is currently at least 128 bits.

ℹ️️ It is recommended that a nonce-source be used with HTML templating engine.
