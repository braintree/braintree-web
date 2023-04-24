"use strict";
/**
 * @module braintree-web/unionpay
 * @description This module allows you to accept UnionPay payments. *It is currently in beta and is subject to change.*
 */

var UnionPay = require("./shared/unionpay");
var basicComponentVerification = require("../lib/basic-component-verification");
var BraintreeError = require("../lib/braintree-error");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var analytics = require("../lib/analytics");
var errors = require("./shared/errors");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] The second argument, `data`, is the {@link UnionPay} instance. If no callback is provided, `create` returns a promise that resolves with the {@link UnionPay} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * braintree.unionpay.create({ client: clientInstance }, function (createErr, unionpayInstance) {
 *   if (createErr) {
 *     console.error(createErr);
 *     return;
 *   }
 *   // ...
 * });
 */
function create(options) {
  var name = "UnionPay";

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
      var config = client.getConfiguration();

      options.client = client;

      if (
        !config.gatewayConfiguration.unionPay ||
        config.gatewayConfiguration.unionPay.enabled !== true
      ) {
        return Promise.reject(new BraintreeError(errors.UNIONPAY_NOT_ENABLED));
      }

      analytics.sendEvent(options.client, "unionpay.initialized");

      return new UnionPay(options);
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
