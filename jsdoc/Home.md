# Braintree Web Client Reference <span>v@VERSION</span>

<span class="rule"></span>

- [Overview](#overview)
  - [Async/await](#async-await)
- [Browser Support](#browser-support)
  - [Desktop](#desktop)
  - [Mobile](#mobile)
  - [Webviews and hybrid environments](#webviews)
- [Teardown](#teardown)
- [Content Security Policy](#content-security-policy)

<span class="rule"></span>

<a id="overview"></a>

## Overview

The Braintree Web SDK is split up into several **modules**. Each module is also represented by a **class** encapsulating the actions that module can perform. In general, each SDK feature is represented by its own standalone module. You can include as many or as few of these modules in your page depending on the Braintree features you will be using.

Each module exports a `create` function which is responsible for returning an instance of that module's class. For instance, the `braintree-web/hosted-fields` module's `create` method will return an instance of the `HostedFields` class.

Many modules require an instance of our `Client` to communicate with our servers; a single `Client` instance can be reused to create several other module instances, as shown below.

<a id="async-await"></a>

### Async/await

All asynchronous methods will return a `Promise`.

```javascript
try {
  const clientInstance = await braintree.client.create({
    authorization: CLIENT_AUTHORIZATION,
  });

  const hostedFieldsInstance = await braintree.hostedFields.create({
    client: clientInstance,
  });

  /* ... */
} catch (err) {
  console.error(err);
}
```

<a id="browser-support"></a>

## Browser support

The Web SDK supports recent versions of all major browsers. As a general policy, we do not support browsers that are no longer receiving security updates. The current minimum versions are listed below. If you have problems with a specific browser or device, contact [our Support team](https://developer.paypal.com/braintree/help).

<a id="desktop"></a>

### Desktop

| Browser        | Minimum version |
| -------------- | --------------- |
| Chrome         | 69              |
| Firefox        | 63              |
| Microsoft Edge | 79              |
| Safari         | 12              |

<a id="mobile"></a>

### Mobile

| Browser                                            | Minimum version |
| -------------------------------------------------- | --------------- |
| Android Chrome                                     | 69              |
| iOS Safari (includes webviews and Webkit browsers) | 12              |
| Samsung Browser                                    | 10              |

<a id="webviews"></a>

### Webviews and hybrid environments

If you are using PayPal in a mobile webview, we recommend using PopupBridge for [iOS](https://github.com/braintree/popup-bridge-ios) or [Android](https://github.com/braintree/popup-bridge-android) to open the PayPal authentication flow in a mobile browser for improved security.

Additionally, `braintree-web` is neither tested nor developed for hybrid runtimes such as Cordova, PhoneGap, Ionic, React Native, and Electron. While some success may be had in such environments, our SDK is optimized for the browser and its security policies and may not function correctly outside of them.

<a id="teardown"></a>

## Teardown

In certain scenarios you may need to clean up your `braintree-web` integration. This is common in single page applications, modal flows, and other situations where state management is a key factor. Any module returned from a `braintree.<component>.create` call that can be torn down will include a `teardown` function.

Invoking `teardown` will clean up any DOM nodes, event handlers, popups and/or iframes that have been created by the integration. Additionally, `teardown` returns a Promise that resolves when it is safe to proceed.

```js
try {
  await hostedFieldsInstance.teardown();
} catch (err) {
  console.error("Could not tear down Hosted Fields!", err);
}
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

### Apple Pay Specific Directives

If using the [Apple Pay component](module-braintree-web_apple-pay.html), include these additional directives:

|            | Sandbox                        | Production                     |
| ---------- | ------------------------------ | ------------------------------ |
| frame-src  | https://applepay.cdn-apple.com | https://applepay.cdn-apple.com |
| img-src    | https://applepay.cdn-apple.com | https://applepay.cdn-apple.com |
| script-src | https://applepay.cdn-apple.com | https://applepay.cdn-apple.com |

If Apple adds redirects or changes URLs related to the Apple Pay component, the domains or URLs in these directives may change.

### Google Pay Specific Directives

If using the [Google Pay component](module-braintree-web_google-payment.html), include these additional directives:

|             | Sandbox                                                                                                         | Production                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| script-src  | pay.google.com                                                                                                  | pay.google.com                                                                                                  |
| connect-src | pay.google.com<br/>https://google.com/pay<br/>https://pay.google.com<br/>https://pay.google.com/about/redirect/ | pay.google.com<br/>https://google.com/pay<br/>https://pay.google.com<br/>https://pay.google.com/about/redirect/ |

If Google adds redirects or changes URLs related to the Google Pay component, the domains or URLs in these directives may change.

### 3D Secure Specific Directives

If using the [3D Secure component](module-braintree-web_three-d-secure.html), include these additional directives:

|             | Sandbox                                                                      | Production                                                           |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| script-src  | songbirdstag.cardinalcommerce.com<br />cas.static.client.cardinaltrusted.com | songbird.cardinalcommerce.com<br />static.client.cardinaltrusted.com |
| frame-src   | \*                                                                           | \*                                                                   |
| connect-src | \*.cardinalcommerce.com<br />\*.cardinaltrusted.com                          | \*.cardinalcommerce.com<br />\*.cardinaltrusted.com                  |
| form-action | \*                                                                           | \*                                                                   |

3D Secure 2 utilizes an iframe implementation that requires the use of the issuing bank's full ACS URL. In contrast to 3D Secure 1, the 3D Secure 2 core framework does not allow masked URLs or redirects. Given that the list of possible ACS URLs changes regularly and varies between issuers and ACS providers, there is not a strict CSP configuration available for 3D Secure 2.

Additionally, 3D Secure 2 includes a data collection flow called "3DS Method" or "Method URL Collection", which also utilizes the ACS URL directly. This process increases authentication success significantly and is considered mandatory by Visa. Blocking this process through a CSP can potentially result in authentication failures and increased friction within the checkout experience.

If maintaining a CSP in an integration that uses 3D Secure, merchants can consider setting `frame-src *` to whitelist all potential ACS URLs that could be utilized during the 3D Secure authentication process.

### Data Collector Specific Directives

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
