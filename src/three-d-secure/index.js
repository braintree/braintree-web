'use strict';
/** @module braintree-web/three-d-secure */

var ThreeDSecure = require('./external/three-d-secure');
var browserDetection = require('../lib/browser-detection');
var BraintreeError = require('../lib/error');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
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
  var config, threeDSecure, merchantErrorMessage, clientVersion;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'threeDSecure.create must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating 3D Secure.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (!config.gatewayConfiguration.threeDSecureEnabled) {
    merchantErrorMessage = '3D Secure is not enabled for this merchant.';
  } else if (config.analyticsMetadata.sdkVersion !== VERSION) {
    merchantErrorMessage = 'Client (version ' + clientVersion + ') and 3D Secure (version ' + VERSION + ') components must be from the same SDK version.';
  } else if (!browserDetection.isHTTPS()) {
    merchantErrorMessage = '3D Secure requires HTTPS.';
  }

  if (merchantErrorMessage) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: merchantErrorMessage
    }));
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
