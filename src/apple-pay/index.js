"use strict";

/**
 * @module braintree-web/apple-pay
 * @description Accept Apple Pay on the Web. *This component is currently in beta and is subject to change.*
 */

var ApplePay = require("./apple-pay");
var analytics = require("../lib/analytics");
var BraintreeError = require("../lib/braintree-error");
var basicComponentVerification = require("../lib/basic-component-verification");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var errors = require("./errors");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.useDeferredClient] Used in conjunction with `authorization`, allows the Apple Pay instance to be available right away by fetching the client configuration in the background. When this option is used, {@link ApplePay#createPaymentRequest} will return a promise that resolves with the configuration instead of returning synchronously.
 * @param {callback} [callback] The second argument, `data`, is the {@link ApplePay} instance. If no callback is provided, `create` returns a promise that resolves with the {@link ApplePay} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
function create(options) {
  var name = "Apple Pay";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var applePayInstance;
      var createPromise = createDeferredClient
        .create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: createAssetsUrl.create(options.authorization),
          name: name,
        })
        .then(function (client) {
          if (!client.getConfiguration().gatewayConfiguration.applePayWeb) {
            return Promise.reject(
              new BraintreeError(errors.APPLE_PAY_NOT_ENABLED)
            );
          }

          analytics.sendEvent(client, "applepay.initialized");

          return client;
        });

      options.createPromise = createPromise;
      applePayInstance = new ApplePay(options);

      if (!options.useDeferredClient) {
        return createPromise.then(function (client) {
          applePayInstance._client = client;

          return applePayInstance;
        });
      }

      return applePayInstance;
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
