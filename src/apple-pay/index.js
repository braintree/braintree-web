'use strict';

/**
 * @module braintree-web/apple-pay
 * @description Accept Apple Pay on the Web. *This component is currently in beta and is subject to change.*
 */

var BraintreeError = require('../lib/error');
var ApplePay = require('./apple-pay');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
var sharedErrors = require('../errors');
var errors = require('./errors');
var VERSION = require('package.version');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} callback The second argument, `data`, is the {@link ApplePay} instance.
 * @returns {void}
 */
function create(options, callback) {
  var clientVersion;

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
      message: 'options.client is required when instantiating Apple Pay.'
    }));
    return;
  }

  clientVersion = options.client.getConfiguration().analyticsMetadata.sdkVersion;
  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and Apple Pay (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (!options.client.getConfiguration().gatewayConfiguration.applePay) {
    callback(new BraintreeError(errors.APPLE_PAY_NOT_ENABLED));
    return;
  }

  analytics.sendEvent(options.client, 'web.applepay.initialized');

  callback(null, new ApplePay(options));
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
