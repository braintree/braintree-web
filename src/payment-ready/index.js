// @ts-nocheck
/** @module braintree-web/payment-ready */

import analytics from "../lib/analytics";
import PaymentReady from "./payment-ready";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
import basicComponentVerification from "../lib/basic-component-verification";
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
 * @param {boolean} [options.debug] A debug flag.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
 * @returns {Promise<PaymentReady>} Returns the PaymentReady instance.
 * @example
 * braintree.paymentReady.create({
 *   client: clientInstance
 * }).then(function (paymentReadyInstance) {
 *   // paymentReadyInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating PaymentReady instance', createErr);
 * });
 * @example <caption>Creating a PaymentReady component</caption>
 * braintree.paymentReady.create({
 *   client: clientInstance,
 * }).then(function (paymentReadyInstance) {
 *   // paymentReadyInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating PaymentReady instance', createErr);
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

export default {
  create,
  VERSION,
};
