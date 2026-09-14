// @ts-nocheck
/** @module braintree-web/sepa */

import analytics from "../lib/analytics";
import SEPA from "./external/sepa";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
import basicComponentVerification from "../lib/basic-component-verification";
import { parse } from "../lib/querystring";
import { assign } from "../lib/assign";
import mandate from "./external/mandate";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.debug] A debug flag.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
 * @returns {Promise} Returns a promise that resolves with the SEPA instance.
 * @example
 * braintree.sepa.create({
 *   client: clientInstance
 * }).then(function (sepaInstance) {
 *   // sepaInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating SEPA instance', createErr);
 * });
 * @example <caption>Creating a SEPA component</caption>
 * braintree.sepa.create({
 *   client: clientInstance,
 * }).then(function (sepaInstance) {
 *   // sepaInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating SEPA instance', createErr);
 * });
 */

function create(options) {
  var name = "SEPA";
  var params = parse(window.location.href);

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

      analytics.sendEvent(client, "sepa.client.initialized");

      return new SEPA(options);
    })
    .then(function (sepaInstance) {
      // This cart_id is actually a V2 orderId
      var redirectComplete =
        params.success && params.success === "true" && params.cart_id;

      if (redirectComplete) {
        options = assign(options, params);

        // Pick up redirect flow where it left off
        return mandate
          .handleApprovalForFullPageRedirect(options.client, options)
          .then(function (payload) {
            sepaInstance.tokenizePayload = payload;

            return sepaInstance;
          })
          .catch(function (err) {
            console.error("Problem while finishing tokenizing: ", err); // eslint-disable-line no-console
          });
      }
      if (params.cancel) {
        analytics.sendEvent(
          options.client,
          "sepa.redirect.customer-canceled.failed"
        );
      }

      return sepaInstance;
    });
}

export default {
  create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION,
};
