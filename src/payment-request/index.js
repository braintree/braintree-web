"use strict";
/**
 * @module braintree-web/payment-request
 * @description A component to integrate with the Payment Request API.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/main/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 * */

var PaymentRequestComponent = require("./external/payment-request");
var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var wrapPromise = require("@braintree/wrap-promise");
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {object} [options.enabledPaymentMethods] An object representing which payment methods to display.
 * @param {boolean} [options.enabledPaymentMethods.basicCard=true] Whether or not to display credit card as an option in the Payment Request dialog. If left blank or set to true, credit cards will be displayed in the dialog if the merchant account is set up to process credit cards.
 * @param {boolean} [options.enabledPaymentMethods.googlePay=true] Whether or not to display Google Pay as an option in the Payment Request dialog. If left blank or set to true, Google Pay will be displayed in the dialog if the merchant account is set up to process Google Pay.
 * @param {Number} [options.googlePayVersion=1] Ignored if `options.enabledPaymentMethods.googlePay = false`. If `true`, this option specifies the version of Google Pay to use. Choose either 1 (default) or 2.
 * @param {callback} [callback] The second argument, `data`, is the {@link PaymentRequestComponent} instance. If no callback is provided, `create` returns a promise that resolves with the {@link PaymentRequestComponent} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
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
 *     googlePay: true,
 *     basicCard: false
 *   }
 * }, cb);
 * @example <caption>Using Google Pay v2 or basic card</caption>
 * braintree.paymentRequest.create({
 *   client: clientInstance,
 *   enabledPaymentMethods: {
 *     basicCard: true,
 *     googlePay: true
 *   },
 *   googlePayVersion: 2
 * }, cb);
 *
 */
function create(options) {
  var name = "Payment Request";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      return createDeferredClient.create({
        authorization: options.authorization,
        client: options.client,
        debug: options.debug,
        assetsUrl: createAssetsUrl.create(options.authorization),
        name: name,
      });
    })
    .then(function (client) {
      var paymentRequestInstance;

      options.client = client;
      paymentRequestInstance = new PaymentRequestComponent(options);

      return paymentRequestInstance.initialize();
    });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
