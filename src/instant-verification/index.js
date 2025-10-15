"use strict";

/** @module braintree-web/instant-verification */

var basicComponentVerification = require("../lib/basic-component-verification");
var BraintreeError = require("../lib/braintree-error");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var errors = require("./errors");
var InstantVerification = require("./instant-verification");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] When provided, will be used instead of a promise. First argument is an error object, second is an instance of {@link InstantVerification}.
 * @returns {Promise<InstantVerification|error>} Returns the InstantVerification instance.
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
        return Promise.reject(
          new BraintreeError(errors.INSTANT_VERIFICATION_NOT_ENABLED)
        );
      }

      return new InstantVerification(options);
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
