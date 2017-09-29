'use strict';
/**
 * @module braintree-web/paypal-checkout
 * @description A component to integrate with the [PayPal Checkout.js library](https://github.com/paypal/paypal-checkout).
 */

var BraintreeError = require('../lib/braintree-error');
var analytics = require('../lib/analytics');
var basicComponentVerification = require('../lib/basic-component-verification');
var errors = require('./errors');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var PayPalCheckout = require('./paypal-checkout');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link PayPalCheckout} instance.
 * @example
 * // Be sure to have checkout.js loaded on your page.
 * // You can use the paypal-checkout package on npm
 * // with a build tool or use a script hosted by PayPal:
 * // <script src="https://www.paypalobjects.com/api/checkout.js" data-version-4 log-level="warn"></script>
 *
 * braintree.paypalCheckout.create({
 *   client: clientInstance
 * }, function (createErr, paypalCheckoutInstance) {
 *   if (createErr) {
 *     console.error('Error!', createErr);
 *     return;
 *   }
 *
 *   paypal.Button.render({
 *     env: 'production', // or 'sandbox'
 *
 *     locale: 'en_US',
 *
 *     payment: function () {
 *       return paypalCheckoutInstance.createPayment({
 *         flow: 'vault'
 *       });
 *     },
 *
 *     onAuthorize: function (data, actions) {
 *       return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
 *         // Submit payload.nonce to your server
 *       });
 *     },
 *
 *     onCancel: function (data) {
 *       console.log('checkout.js payment cancelled', JSON.stringify(data, 0, 2));
 *     },
 *
 *     onError: function (err) {
 *       console.error('checkout.js error', err);
 *     }
 *   }, '#paypal-button'); // the PayPal button will be rendered in an html element with the id `paypal-button`
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'PayPal Checkout',
    client: options.client
  }).then(function () {
    var config = options.client.getConfiguration();

    if (!config.gatewayConfiguration.paypalEnabled) {
      return Promise.reject(new BraintreeError(errors.PAYPAL_NOT_ENABLED));
    }

    if (!config.gatewayConfiguration.paypal.clientId) {
      return Promise.reject(new BraintreeError(errors.PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED));
    }

    analytics.sendEvent(options.client, 'paypal-checkout.initialized');

    return new PayPalCheckout(options);
  });
}

/**
 * @static
 * @function isSupported
 * @description Returns true if PayPal Checkout [supports this browser](index.html#browser-support-webviews).
 * @deprecated Previously, this method checked for Popup support in the browser. Checkout.js now falls back to a modal if popups are not supported.
 * @example
 * if (braintree.paypalCheckout.isSupported()) {
 *   // Add PayPal button to the page
 * } else {
 *   // Hide PayPal payment option
 * }
 * @returns {Boolean} Returns true if PayPal Checkout supports this browser.
 */
function isSupported() {
  return true;
}

module.exports = {
  create: wrapPromise(create),
  isSupported: isSupported,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
