'use strict';
/** @module braintree-web/paypal-checkout */

var BraintreeError = require('../lib/braintree-error');
var analytics = require('../lib/analytics');
var errors = require('./errors');
var Promise = require('../lib/promise');
var wrapPromise = require('../lib/wrap-promise');
var PayPalCheckout = require('./paypal-checkout');
var sharedErrors = require('../lib/errors');
var browserDetection = require('../lib/browser-detection');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link PayPalCheckout} instance.
 * @example
 * braintree.paypalCheckout.create({
 *   client: clientInstance
 * }, function (createErr, paypalCheckoutInstance) {
 *   if (createErr) {
 *     if (createErr.code === 'PAYPAL_BROWSER_NOT_SUPPORTED') {
 *       console.error('This browser is not supported.');
 *     } else {
 *       console.error('Error!', createErr);
 *     }
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
 *       }).catch(function (err) {
 *         // handle error
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
 * @returns {Promise|void} Returns the PayPalCheckout instance.
 */
function create(options) {
  return new Promise(function (resolve, reject) {
    var config, clientVersion;

    if (options.client == null) {
      reject(new BraintreeError({
        type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
        code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
        message: 'options.client is required when instantiating PayPal Checkout.'
      }));
      return;
    }

    config = options.client.getConfiguration();
    clientVersion = config.analyticsMetadata.sdkVersion;

    if (clientVersion !== VERSION) {
      reject(new BraintreeError({
        type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
        code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
        message: 'Client (version ' + clientVersion + ') and PayPal Checkout (version ' + VERSION + ') components must be from the same SDK version.'
      }));
      return;
    }

    if (!config.gatewayConfiguration.paypalEnabled) {
      reject(new BraintreeError(errors.PAYPAL_NOT_ENABLED));
      return;
    }

    if (!browserDetection.supportsPopups()) {
      reject(new BraintreeError(errors.PAYPAL_BROWSER_NOT_SUPPORTED));
      return;
    }

    analytics.sendEvent(options.client, 'paypal-checkout.initialized');

    resolve(new PayPalCheckout(options));
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
