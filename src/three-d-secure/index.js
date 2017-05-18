'use strict';
/** @module braintree-web/three-d-secure */

var ThreeDSecure = require('./external/three-d-secure');
var isHTTPS = require('../lib/is-https').isHTTPS;
var BraintreeError = require('../lib/braintree-error');
var analytics = require('../lib/analytics');
var errors = require('./shared/errors');
var sharedErrors = require('../lib/errors');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link ThreeDSecure} instance. If no callback is provided, it returns a promise that resolves the {@link ThreeDSecure} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example
 * braintree.threeDSecure.create({
 *   client: client
 * }, callback);
 */
function create(options) {
  var config, error, clientVersion, isProduction;

  if (options.client == null) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating 3D Secure.'
    }));
  }

  config = options.client.getConfiguration();
  clientVersion = options.client.getVersion();

  if (!config.gatewayConfiguration.threeDSecureEnabled) {
    error = errors.THREEDS_NOT_ENABLED;
  } else if (clientVersion !== VERSION) {
    error = {
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and 3D Secure (version ' + VERSION + ') components must be from the same SDK version.'
    };
  }

  isProduction = config.gatewayConfiguration.environment === 'production';

  if (isProduction && !isHTTPS()) {
    error = errors.THREEDS_HTTPS_REQUIRED;
  }

  if (error) {
    return Promise.reject(new BraintreeError(error));
  }

  analytics.sendEvent(options.client, 'threedsecure.initialized');

  return Promise.resolve(new ThreeDSecure(options));
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
