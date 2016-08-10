'use strict';
/** @module braintree-web/three-d-secure */

var ThreeDSecure = require('./external/three-d-secure');
var browserDetection = require('../lib/browser-detection');
var BraintreeError = require('../lib/error');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
var errors = require('./shared/errors');
var sharedErrors = require('../errors');
var VERSION = require('package.version');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} callback The second argument, `data`, is the {@link ThreeDSecure} instance.
 * @returns {void}
 * @example
 * braintree.threeDSecure.create({
 *   client: client
 * }, callback);
 */
function create(options, callback) {
  var config, threeDSecure, error, clientVersion;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'create must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating 3D Secure.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (!config.gatewayConfiguration.threeDSecureEnabled) {
    error = errors.THREEDS_NOT_ENABLED;
  } else if (config.analyticsMetadata.sdkVersion !== VERSION) {
    error = {
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and 3D Secure (version ' + VERSION + ') components must be from the same SDK version.'
    };
  } else if (!browserDetection.isHTTPS()) {
    error = errors.THREEDS_HTTPS_REQUIRED;
  }

  if (error) {
    callback(new BraintreeError(error));
    return;
  }

  analytics.sendEvent(options.client, 'web.threedsecure.initialized');

  try {
    threeDSecure = new ThreeDSecure(options);
  } catch (err) {
    callback(err);
    return;
  }

  callback(null, threeDSecure);
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
