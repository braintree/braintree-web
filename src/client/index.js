"use strict";

var BraintreeError = require("../lib/braintree-error");
var Client = require("./client");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");
var sharedErrors = require("../lib/errors");

/** @module braintree-web/client */

/**
 * @function create
 * @description This function is the entry point for the <code>braintree.client</code> module. It is used for creating {@link Client} instances that service communication to Braintree servers.
 * @param {object} options Object containing all {@link Client} options:
 * @param {string} options.authorization A tokenizationKey or clientToken.
 * @param {callback} [callback] The second argument, <code>data</code>, is the {@link Client} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   if (createErr) {
 *     if (createErr.code === 'CLIENT_AUTHORIZATION_INVALID') {
 *       // either the client token has expired, and a new one should be generated
 *       // or the tokenization key was deactivated or deleted
 *     } else {
 *       console.log('something went wrong creating the client instance', createErr);
 *     }
 *     return;
 *   }
 *
 *  // set up other components
 * });
 * @static
 */
function create(options) {
  if (!options.authorization) {
    return Promise.reject(
      new BraintreeError({
        type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
        code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
        message:
          "options.authorization is required when instantiating a client.",
      })
    );
  }

  return Client.initialize(options);
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
