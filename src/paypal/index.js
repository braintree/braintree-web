'use strict';
/** @module braintree-web/paypal */

var analytics = require('../lib/analytics');
var BraintreeError = require('../lib/braintree-error');
var browserDetection = require('../lib/browser-detection');
var deferred = require('../lib/deferred');
var errors = require('./shared/errors');
var throwIfNoCallback = require('../lib/throw-if-no-callback');
var PayPal = require('./external/paypal');
var sharedErrors = require('../lib/errors');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} callback The second argument, `data`, is the {@link PayPal} instance.
 * @example
 * braintree.paypal.create({
 *   client: clientInstance
 * }, function (createErr, paypalInstance) {
 *   if (createErr) {
 *     if (createErr.code === 'PAYPAL_BROWSER_NOT_SUPPORTED') {
 *       console.error('This browser is not supported.');
 *     } else {
 *       console.error('Error!', createErr);
 *     }
 *   }
 * });
 * @returns {void}
 */
function create(options, callback) {
  var config, pp, clientVersion;

  throwIfNoCallback(callback, 'create');

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating PayPal.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and PayPal (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (config.gatewayConfiguration.paypalEnabled !== true) {
    callback(new BraintreeError(errors.PAYPAL_NOT_ENABLED));
    return;
  }

  if (!global.popupBridge && !browserDetection.supportsPopups()) {
    callback(new BraintreeError(errors.PAYPAL_BROWSER_NOT_SUPPORTED));
    return;
  }

  analytics.sendEvent(options.client, 'paypal.initialized');

  pp = new PayPal(options);
  pp._initialize(function () {
    callback(null, pp);
  });
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
