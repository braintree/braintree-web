'use strict';
/** @module braintree-web/paypal */

var PayPal = require('./external/paypal');
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
 * @param {callback} callback The second argument, `data`, is the {@link PayPal} instance.
 * @returns {void}
 */
function create(options, callback) {
  var config, pp, clientVersion;

  if (!callback) {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'create must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating PayPal.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Client (version ' + clientVersion + ') and PayPal (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (config.gatewayConfiguration.paypalEnabled !== true) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'PayPal is not enabled for this merchant.'
    }));
    return;
  }

  if (!_isBrowserSupported()) {
    callback(new BraintreeError({
      type: BraintreeError.types.CUSTOMER,
      message: 'Browser is not supported.'
    }));
    return;
  }

  analytics.sendEvent(options.client, 'web.paypal.initialized');

  pp = new PayPal(options);
  pp._initialize(function () {
    callback(null, pp);
  });
}

function _isBrowserSupported() {
  return !browserDetection.isOperaMini();
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
