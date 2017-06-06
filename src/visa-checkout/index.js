'use strict';

/**
 * @module braintree-web/visa-checkout
 * @description Processes Visa Checkout. *This component is currently in beta and is subject to change.*
 */

var BraintreeError = require('../lib/braintree-error');
var VisaCheckout = require('./visa-checkout');
var analytics = require('../lib/analytics');
var sharedErrors = require('../lib/errors');
var errors = require('./errors');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link VisaCheckout} instance. If no callback is provided, `create` returns a promise that resolves with the {@link VisaCheckout} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  var clientVersion;

  if (options.client == null) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating Visa Checkout.'
    }));
  }

  clientVersion = options.client.getVersion();
  if (clientVersion !== VERSION) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and Visa Checkout (version ' + VERSION + ') components must be from the same SDK version.'
    }));
  }

  if (!options.client.getConfiguration().gatewayConfiguration.visaCheckout) {
    return Promise.reject(new BraintreeError(errors.VISA_CHECKOUT_NOT_ENABLED));
  }

  analytics.sendEvent(options.client, 'visacheckout.initialized');

  return Promise.resolve(new VisaCheckout(options));
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
