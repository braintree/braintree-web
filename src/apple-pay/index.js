// @ts-nocheck
/**
 * @module braintree-web/apple-pay
 * @description Accept Apple Pay on the Web. *This component is currently in beta and is subject to change.*
 */

import ApplePay from "./apple-pay";
import analytics from "../lib/analytics";
import BraintreeError from "../lib/braintree-error";
import basicComponentVerification from "../lib/basic-component-verification";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
import errors from "./errors";
/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.useDeferredClient] Used in conjunction with `authorization`, allows the Apple Pay instance to be available right away by fetching the client configuration in the background.
 * @param {boolean} [options.loadApplePaySDK=true] Whether to automatically load Apple's Apple Pay JS SDK, which enables Apple Pay in non-Safari browsers and cross-device QR handoff. Set to `false` to disable this or if you prefer to load the Apple Pay SDK manually.
 * @returns {Promise} Returns a promise that resolves with the {@link ApplePay} instance.
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
            throw new BraintreeError(errors.APPLE_PAY_NOT_ENABLED);
          }

          analytics.sendEvent(client, "applepay.initialized");

          return client;
        });

      options.createPromise = createPromise;
      applePayInstance = new ApplePay(options);

      if (!options.useDeferredClient) {
        return createPromise.then(function (client) {
          applePayInstance._client = client;

          return applePayInstance._sdkLoadPromise.then(function () {
            return applePayInstance;
          });
        });
      }

      return applePayInstance;
    });
}

export default {
  create,
  VERSION,
};
