'use strict';

/**
 * @module braintree-web/visa-checkout
 * @description Processes Visa Checkout. *This component is currently in beta and is subject to change.*
 */

var BraintreeError = require('../lib/braintree-error');
var VisaCheckout = require('./visa-checkout');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
var sharedErrors = require('../lib/errors');
var errors = require('./errors');
var VERSION = process.env.npm_package_version;
var throwIfNoCallback = require('../lib/throw-if-no-callback');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} callback The second argument, `data`, is the {@link VisaCheckout} instance.
 * @returns {void}
 */
function create(options, callback) {
  var clientVersion;

  throwIfNoCallback(callback, 'create');

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating Visa Checkout.'
    }));
    return;
  }

  clientVersion = options.client.getConfiguration().analyticsMetadata.sdkVersion;
  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and Visa Checkout (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (!options.client.getConfiguration().gatewayConfiguration.visaCheckout) {
    callback(new BraintreeError(errors.VISA_CHECKOUT_NOT_ENABLED));
    return;
  }

  analytics.sendEvent(options.client, 'web.visacheckout.initialized');

  callback(null, new VisaCheckout(options));
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
