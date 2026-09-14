// @ts-nocheck
/** @module braintree-web/instant-verification */

import basicComponentVerification from "../lib/basic-component-verification";
import BraintreeError from "../lib/braintree-error";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
import errors from "./errors";
import InstantVerification from "./instant-verification";
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
 * @returns {Promise<InstantVerification|error>} Returns a Promise that resolves with the InstantVerification instance.
 * @example
 * braintree.instantVerification.create({
 *   client: clientInstance
 * }).then(function (instantVerificationInstance) {
 *   // instantVerificationInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating Instant Verification instance', createErr);
 * });
 */
function create(options) {
  var instantVerification;
  var name = "Instant Verification";

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

      // GraphQL Team decided to stick to the OpenBanking in the clientConfiguration
      instantVerification =
        options.client.getConfiguration().gatewayConfiguration.openBanking;

      if (!instantVerification) {
        throw new BraintreeError(errors.INSTANT_VERIFICATION_NOT_ENABLED);
      }

      return new InstantVerification(options);
    });
}

export default {
  create,
  VERSION,
};
