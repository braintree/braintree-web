# Braintree Web Client Reference <span>v@VERSION</span>

<span class="rule"></span>

* [Overview](#overview)
    * [Module Hierarchy](#module-hierarchy)
    * [Callbacks](#callbacks)
    * [Promises](#promises)
* [Browser Support](#browser-support)
    * [Desktop](#browser-support-desktop)
    * [Mobile](#browser-support-mobile)
    * [Webviews](#browser-support-webviews)
* [Teardown](#teardown)
* [Content Security Policy](#content-security-policy)

<span class="rule"></span>

<a id="overview"></a>
## Overview

The Braintree JavaScript SDK is split up into several __modules__. Each module is also represented by a __class__ encapsulating the actions that module can perform. In general, each SDK feature is represented by its own standalone module. You can include as many or as few of these modules in your page depending on the Braintree features you will be using.

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

This SDK uses the Node.js callback style, with callbacks passed as the last argument to a function. Callbacks are expected to receive possible errors as the first parameter, and any returned data as the second:

In addition to callbacks, all asyncronous methods will return a `Promise` if no callback is provided:

```javascript
braintree.client.create({
  authorization: CLIENT_AUTHORIZATION
}).then(function (client) {
  // Create other components
});
```

<a id="browser-support"></a>
## Browser support

The Braintree JS SDK provides support for numerous browsers and devices. There are, however, caveats with certain integrations and browser combinations.

While `braintree-web` will work in browsers other than the ones below, these represent the platforms against which we actively test. If you have problems with a specific browser or device, contact [our Support team](https://developers.braintreepayments.com/forms/contact).

<a id="browser-support-desktop"></a>
### Desktop


- Chrome latest
- Firefox latest
- Internet Explorer 9+ (see caveats below)
- Microsoft Edge
- Safari 8+


#### Internet Explorer caveats

##### Quirks Mode

Quirks Mode is not supported for any version of IE. See our [general best practices](https://developers.braintreepayments.com/reference/general/best-practices#internet-explorer-quirks-mode) to learn more.

##### Older TLS versions

Braintree is [ending support for server-side API requests via TLS 1.0 and 1.1 on June 30, 2017](https://www.braintreepayments.com/blog/updating-your-production-environment-to-support-tlsv1-2/), and plans to do the same for client requests in the future. The sandbox no longer accepts connections using these older TLS versions as of December 13, 2016. Internet Explorer 9 and 10 do not use TLS 1.2 by default; once client-side support for older TLS versions has been dropped, this SDK will only work if customers have explicitly enabled TLS 1.2 in their IE settings.

<a id="browser-support-mobile"></a>
### Mobile

#### iOS

- Safari 8+
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

In certain scenarios you may need to remove your `braintree-web` integration. This is common in single page applications, modal flows, and other situations where state management is a key factor. Any module returned from a `braintree.component.create` call will include a `teardown` function.

Invoking `teardown` will clean up any DOM nodes, event handlers, popups and/or iframes that have been created by the integration. Additionally, `teardown` accepts a callback which you can use to know when it is safe to proceed.

```js
hostedFieldsInstance.teardown(function (err) {
  if (err) {
    console.error('Could not tear down Hosted Fields!');
  } else {
    console.log('Hosted Fields has been torn down!');
  }
});
```

If you happen to call this method while the instance's `teardown` is in progress, you'll receive an error. Once completed, calling any methods on the instance will throw an error.

<a id="content-security-policy"></a>
## Using `braintree-web` with a Content Security Policy

[Content Security Policy](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is a feature of web browsers that mitigates cross-site scripting and other attacks. By limiting the origins of resources that may be loaded on your page, you can maintain tighter control over any potentially malicious code. We recommend considering the implementation of a CSP when available.

You will need to add the following directives to your policy:

|             | Sandbox                                                                            | Production                                                                        |
|-------------|------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| script-src  | js.braintreegateway.com<br/>assets.braintreegateway.com<br/>www.paypalobjects.com  | js.braintreegateway.com<br/>assets.braintreegateway.com<br/>www.paypalobjects.com |
| style-src   | 'unsafe-inline'                                                                    | 'unsafe-inline'                                                                   |
| img-src     | assets.braintreegateway.com<br/>checkout.paypal.com<br/>data:                      | assets.braintreegateway.com<br/>checkout.paypal.com<br/>data:                     |
| child-src   | assets.braintreegateway.com<br/>c.paypal.com                                       | assets.braintreegateway.com<br/>c.paypal.com                                      |
| frame-src   | assets.braintreegateway.com<br/>c.paypal.com                                       | assets.braintreegateway.com<br/>c.paypal.com                                      |
| connect-src | api.sandbox.braintreegateway.com<br/>client-analytics.sandbox.braintreegateway.com | api.braintreegateway.com<br/>client-analytics.braintreegateway.com                |
