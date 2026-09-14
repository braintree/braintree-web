// @ts-nocheck
import BraintreeError from "../lib/braintree-error";
import Client from "./client";
/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
import sharedErrors from "../lib/errors";
const VERSION = __SDK_VERSION__;

/** @module braintree-web/client */

/**
 * @function create
 * @description This function is the entry point for the <code>braintree.client</code> module. It is used for creating {@link Client} instances that service communication to Braintree servers.
 * @param {object} options Object containing all {@link Client} options:
 * @param {string} options.authorization A tokenizationKey or clientToken.
 * @returns {Promise} Returns a promise that resolves with the {@link Client} instance.
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }).then(function (clientInstance) {
 *  // set up other components
 * }).catch(function (createErr) {
 *   if (createErr.code === 'CLIENT_AUTHORIZATION_INVALID') {
 *     // either the client token has expired, and a new one should be generated
 *     // or the tokenization key was deactivated or deleted
 *   } else {
 *     console.log('something went wrong creating the client instance', createErr);
 *   }
 * });
 * @static
 */
async function create(options) {
  if (!options.authorization) {
    throw new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: "options.authorization is required when instantiating a client.",
    });
  }

  return await Client.initialize(options);
}

export default {
  create,
  VERSION,
};
