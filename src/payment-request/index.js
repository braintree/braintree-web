'use strict';
/**
 * @module braintree-web/payment-request
 * @description A component to integrate with the Payment Request API.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/master/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 * */

var PaymentRequestComponent = require('./external/payment-request');
var basicComponentVerification = require('../lib/basic-component-verification');
var wrapPromise = require('@braintree/wrap-promise');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {object} [options.enabledPaymentMethods] An object representing which payment methods to display.
 * @param {boolean} [options.enabledPaymentMethods.basicCard=true] Whether or not to display credit card as an option in the Payment Request dialog. If left blank or set to true, credit cards will be displayed in the dialog if the merchant account is set up to process credit cards.
 * @param {boolean} [options.enabledPaymentMethods.payWithGoogle=true] Whether or not to display Pay with Google as an option in the Payment Request dialog. If left blank or set to true, Pay with Google will be displayed in the dialog if the merchant account is set up to process Pay with Google.
 * @param {callback} [callback] The second argument, `data`, is the {@link PaymentRequestComponent} instance. If no callback is provided, `create` returns a promise that resolves with the {@link PaymentRequestComponent} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example
 * if (window.PaymentRequest) {
 *   braintree.paymentRequest.create({
 *     client: clientInstance
 *   }, cb);
 * } else {
 *   // fall back to Hosted Fields if browser does not support Payment Request API
 *   braintree.hostedFields.create(hostedFieldsOptions, cb);
 * }
 * @example <caption>Explicitly turning off credit cards from Payment Request API dialog</caption>
 * braintree.paymentRequest.create({
 *   client: clientInstance,
 *   enabledPaymentMethods: {
 *     payWithGoogle: true,
 *     basicCard: false
 *   }
 * }, cb);
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'Payment Request',
    client: options.client
  }).then(function () {
    var paymentRequestInstance = new PaymentRequestComponent(options);

    return paymentRequestInstance.initialize();
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
