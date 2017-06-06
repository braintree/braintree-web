'use strict';
/**
 * @module braintree-web/american-express
 * @description This module is for use with Amex Express Checkout. To accept American Express cards, use Hosted Fields.
 */

var BraintreeError = require('../lib/braintree-error');
var AmericanExpress = require('./american-express');
var sharedErrors = require('../lib/errors');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link AmericanExpress} instance. If no callback is provided, `create` returns a promise that resolves with the {@link AmericanExpress} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  var clientVersion;

  if (options.client == null) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating American Express.'
    }));
  }

  clientVersion = options.client.getVersion();
  if (clientVersion !== VERSION) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and American Express (version ' + VERSION + ') components must be from the same SDK version.'
    }));
  }

  return Promise.resolve(new AmericanExpress(options));
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
