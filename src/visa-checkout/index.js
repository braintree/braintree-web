"use strict";

/**
 * @module braintree-web/visa-checkout
 * @description Processes Visa Checkout. *This component is currently in beta and is subject to change.*
 */

var basicComponentVerification = require("../lib/basic-component-verification");
var BraintreeError = require("../lib/braintree-error");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var VisaCheckout = require("./visa-checkout");
var analytics = require("../lib/analytics");
var errors = require("./errors");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] The second argument, `data`, is the {@link VisaCheckout} instance. If no callback is provided, `create` returns a promise that resolves with the {@link VisaCheckout} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
function create(options) {
  var name = "Visa Checkout";

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

      if (
        !options.client.getConfiguration().gatewayConfiguration.visaCheckout
      ) {
        return Promise.reject(
          new BraintreeError(errors.VISA_CHECKOUT_NOT_ENABLED)
        );
      }

      analytics.sendEvent(options.client, "visacheckout.initialized");

      return new VisaCheckout(options);
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
