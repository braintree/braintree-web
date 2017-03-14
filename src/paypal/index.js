'use strict';
/**
 * @module braintree-web/paypal
 * @description A component to integrate with PayPal.
 */

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
 * // We recomend creating your PayPal button with button.js
 * // For an example, see http://codepen.io/braintree/pen/LNKJWa
 * var paypalButton = document.querySelector('.paypal-button');
 *
 * braintree.client.create({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (clientErr, clientInstance) {
 *   if (clientErr) {
 *     console.error('Error creating client:', clientErr);
 *     return;
 *   }
 *
 *   braintree.paypal.create({
 *     client: clientInstance
 *   }, function (paypalErr, paypalInstance) {
 *     if (paypalErr) {
 *       console.error('Error creating PayPal:', paypalErr);
 *       return;
 *     }
 *
 *     paypalButton.removeAttribute('disabled');
 *
 *     // When the button is clicked, attempt to tokenize.
 *     paypalButton.addEventListener('click', function (event) {
 *       // Because tokenization opens a popup, this has to be called as a result of
 *       // customer action, like clicking a button. You cannot call this at any time.
 *       paypalInstance.tokenize({
 *         flow: 'vault'
 *         // For more tokenization options, see the full PayPal tokenization documentation
 *         // http://braintree.github.io/braintree-web/current/PayPal.html#tokenize
 *       }, function (tokenizeErr, payload) {
 *         if (tokenizeErr) {
 *           if (tokenizeErr.type !== 'CUSTOMER') {
 *             console.error('Error tokenizing:', tokenizeErr);
 *           }
 *           return;
 *         }
 *
 *         // Tokenization succeeded
 *         paypalButton.setAttribute('disabled', true);
 *         console.log('Got a nonce! You should submit this to your server.');
 *         console.log(payload.nonce);
 *       });
 *     }, false);
 *   });
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

  if (!isSupported()) {
    callback(new BraintreeError(errors.PAYPAL_BROWSER_NOT_SUPPORTED));
    return;
  }

  analytics.sendEvent(options.client, 'paypal.initialized');

  pp = new PayPal(options);
  pp._initialize(function () {
    callback(null, pp);
  });
}

/**
 * @static
 * @function isSupported
 * @description Returns true if PayPal [supports this browser](/current/#browser-support-webviews).
 * @example
 * if (braintree.paypal.isSupported()) {
 *   // Add PayPal button to the page
 * } else {
 *   // Hide PayPal payment option
 * }
 * @returns {Boolean} Returns true if PayPal supports this browser.
 */
function isSupported() {
  return Boolean(global.popupBridge || browserDetection.supportsPopups());
}

module.exports = {
  create: create,
  isSupported: isSupported,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
