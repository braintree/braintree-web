'use strict';
/** @module braintree-web/masterpass
 * @description Processes Masterpass. *This component is currently in beta and is subject to change.*
 */

var BraintreeError = require('../lib/braintree-error');
var basicComponentVerification = require('../lib/basic-component-verification');
var browserDetection = require('./shared/browser-detection');
var Masterpass = require('./external/masterpass');
var VERSION = process.env.npm_package_version;
var errors = require('./shared/errors');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link Masterpass} instance. If no callback is passed in, the create function returns a promise that resolves the {@link Masterpass} instance.
 * @example
 * braintree.masterpass.create({
 *   client: clientInstance
 * }, function (createErr, masterpassInstance) {
 *   if (createErr) {
 *     if (createErr.code === 'MASTERPASS_BROWSER_NOT_SUPPORTED') {
 *       console.error('This browser is not supported.');
 *     } else {
 *       console.error('Error!', createErr);
 *     }
 *     return;
 *   }
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'Masterpass',
    client: options.client
  }).then(function () {
    var masterpassInstance, configuration;

    if (!isSupported()) {
      return Promise.reject(new BraintreeError(errors.MASTERPASS_BROWSER_NOT_SUPPORTED));
    }

    configuration = options.client.getConfiguration().gatewayConfiguration;
    if (!configuration.masterpass) {
      return Promise.reject(new BraintreeError(errors.MASTERPASS_NOT_ENABLED));
    }

    masterpassInstance = new Masterpass(options);

    return masterpassInstance._initialize();
  });
}

/**
 * @static
 * @function isSupported
 * @description Returns true if Masterpass supports this browser.
 * @example
 * if (braintree.masterpass.isSupported()) {
 *   // Add Masterpass button to the page
 * } else {
 *   // Hide Masterpass payment option
 * }
 * @returns {Boolean} Returns true if Masterpass supports this browser.
 */
function isSupported() {
  return Boolean(global.popupBridge || browserDetection.supportsPopups());
}

module.exports = {
  create: wrapPromise(create),
  isSupported: isSupported,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
