'use strict';
/**
 * @module braintree-web/google-payment
 * @description A component to integrate with Google Pay.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/master/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 * */

var basicComponentVerification = require('../lib/basic-component-verification');
var BraintreeError = require('../lib/braintree-error');
var browserDetection = require('./browser-detection');
var GooglePayment = require('./google-payment');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link GooglePayment} instance. If no callback is provided, `create` returns a promise that resolves with the {@link GooglePayment} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'Google Pay',
    client: options.client
  }).then(function () {
    var googlePayment;

    if (!options.client.getConfiguration().gatewayConfiguration.androidPay) {
      return Promise.reject(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        code: 'GOOGLE_PAYMENT_NOT_ENABLED',
        message: 'Google Pay is not enabled for this merchant.'
      }));
    }

    googlePayment = new GooglePayment(options);

    return googlePayment.initialize();
  });
}

/**
 * @static
 * @function isSupported
 * @description Returns true if Google Pay is supported in this browser.
 * @example
 * if (braintree.googlePayment.isSupported()) {
 *    // Add Google Pay button to page and
 *    // initialize Google Pay component
 * } else {
 *    // Do not initialize Google Pay component
 * }
 * @returns {Boolean} Returns true if Google Pay supports this browser.
 */
function isSupported() {
  // TODO - We limit this to android chrome for now
  // Once it works in Desktop Chrome, we can just check that it's Chrome
  return Boolean(browserDetection.supportsPaymentRequestApi() && browserDetection.isAndroid());
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
