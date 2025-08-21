"use strict";
/** @module braintree-web/payment-ready */

var analytics = require("../lib/analytics");
var PaymentReady = require("./payment-ready");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var basicComponentVerification = require("../lib/basic-component-verification");
var wrapPromise = require("@braintree/wrap-promise");
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.debug] A debug flag.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
 * @param {callback} [callback] When provided, will be used instead of a promise. First argument is an error object, where the second is an instance of {@link PaymentReady|PaymentReady}.
 * @returns {Promise<PaymentReady>} Returns the PAYMENTREADY instance.
 * @example
 * braintree.paymentReady.create({
 *   client: clientInstance
 * }).then(function (paymentReadyInstance) {
 *   // paymentReadyInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating PAYMENTREADY instance', createErr);
 * });
 * @example <caption>Creating a PAYMENTREADY component</caption>
 * braintree.paymentReady.create({
 *   client: clientInstance,
 * }).then(function (paymentReadyInstance) {
 *   // paymentReadyInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating PAYMENT READY instance', createErr);
 * });
 */

function create(options) {
  var name = "PAYMENT READY";

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
      options.client = client;

      analytics.sendEvent(client, "payment-ready.client.initialized");

      return new PaymentReady(options);
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
