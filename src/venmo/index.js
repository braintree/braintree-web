'use strict';
/** @module braintree-web/venmo */

var analytics = require('../lib/analytics');
var basicComponentVerification = require('../lib/basic-component-verification');
var errors = require('./shared/errors');
var wrapPromise = require('@braintree/wrap-promise');
var BraintreeError = require('../lib/braintree-error');
var Venmo = require('./venmo');
var Promise = require('../lib/promise');
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {boolean} [options.allowNewBrowserTab=true] This should be set to false if your payment flow requires returning to the same tab, e.g. single page applications. Doing so causes {@link Venmo#isBrowserSupported|isBrowserSupported} to return true only for mobile web browsers that support returning from the Venmo app to the same tab.
 * @param {callback} [callback] The second argument, `data`, is the {@link Venmo} instance. If no callback is provided, `create` returns a promise that resolves with the {@link Venmo} instance.
 * @example
 * braintree.venmo.create({
 *   client: clientInstance
 * }).then(function (venmoInstance) {
 *   // venmoInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating Venmo instance', createErr);
 * });
 * @returns {Promise|void} Returns the Venmo instance.
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'Venmo',
    client: options.client
  }).then(function () {
    var instance;
    var configuration = options.client.getConfiguration();

    if (!configuration.gatewayConfiguration.payWithVenmo) {
      return Promise.reject(new BraintreeError(errors.VENMO_NOT_ENABLED));
    }

    instance = new Venmo(options);

    analytics.sendEvent(options.client, 'venmo.initialized');

    return instance._initialize();
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
