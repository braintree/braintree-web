'use strict';

var BraintreeError = require('../lib/braintree-error');
var Client = require('./client');
var getConfiguration = require('./get-configuration').getConfiguration;
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('../lib/wrap-promise');
var sharedErrors = require('../lib/errors');

/** @module braintree-web/client */

/**
 * @function
 * @description This function is the entry point for the <code>braintree.client</code> module. It is used for creating {@link Client} instances that service communication to Braintree servers.
 * @param {object} options Object containing all {@link Client} options:
 * @param {string} options.authorization A tokenizationKey or clientToken.
 * @param {callback} [callback] The second argument, <code>data</code>, is the {@link Client} instance.
 * @returns {Promise|void} Returns a promise that resolves the client instance if no callback is provided.
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   // ...
 * });
 * @static
 */
function create(options) {
  return new Promise(function (resolve) {
    if (!options.authorization) {
      throw new BraintreeError({
        type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
        code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
        message: 'options.authorization is required when instantiating a client.'
      });
    }

    getConfiguration(options, function (err, configuration) {
      var client;

      if (err) {
        throw err;
      }

      if (options.debug) {
        configuration.isDebug = true;
      }

      try {
        client = new Client(configuration);
      } catch (clientCreationError) {
        throw clientCreationError;
      }

      resolve(client);
    });
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
