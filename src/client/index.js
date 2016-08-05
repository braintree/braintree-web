'use strict';

var BraintreeError = require('../lib/error');
var Client = require('./client');
var getConfiguration = require('./get-configuration').getConfiguration;
var packageVersion = require('package.version');
var deferred = require('../lib/deferred');
var sharedErrors = require('../errors');

/** @module braintree-web/client */

/**
 * @function
 * @description This function is the entry point for the <code>braintree.client</code> module. It is used for creating {@link Client} instances that service communication to Braintree servers.
 * @param {object} options Object containing all {@link Client} options:
 * @param {string} options.authorization A tokenizationKey or clientToken.
 * @param {callback} callback The second argument, <code>data</code>, is the {@link Client} instance.
 * @returns {void}
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   ...
 * });
 * @static
 */
function create(options, callback) {
  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'create must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (!options.authorization) {
    callback(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.authorization is required when instantiating a client.'
    }));
    return;
  }

  getConfiguration(options, function (err, configuration) {
    var client;

    if (err) {
      callback(err);
      return;
    }

    try {
      client = new Client(configuration);
    } catch (clientCreationError) {
      callback(clientCreationError);
      return;
    }

    callback(null, client);
  });
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: packageVersion
};
