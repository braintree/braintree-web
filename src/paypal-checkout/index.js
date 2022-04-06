"use strict";
/**
 * @module braintree-web/paypal-checkout
 * @description A component to integrate with the [PayPal JS SDK](https://github.com/paypal/paypal-checkout-components).
 */

var basicComponentVerification = require("../lib/basic-component-verification");
var wrapPromise = require("@braintree/wrap-promise");
var PayPalCheckout = require("./paypal-checkout");
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @description There are two ways to integrate the PayPal Checkout component. See the [PayPal Checkout constructor documentation](PayPalCheckout.html#PayPalCheckout) for more information and examples.
 *
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.merchantAccountId] A non-default merchant account ID to use for tokenization.
 * @param {boolean} [options.autoSetDataUserIdToken=false] Whether or not to render the PayPal SDK button with a customer's vaulted PayPal account. Must be used in conjunction with a Client Token generated with a customer id.
 * @param {callback} [callback] The second argument, `data`, is the {@link PayPalCheckout} instance.
 * @example
 * braintree.client.create({
 *   authorization: 'authorization'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckout.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutInstance) {
 *   // set up the PayPal JS SDK
 * }).catch(function (err) {
 *   console.error('Error!', err);
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
function create(options) {
  var name = "PayPal Checkout";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var instance = new PayPalCheckout(options);

      return instance._initialize(options);
    });
}

/**
 * @static
 * @function isSupported
 * @description Returns true if PayPal Checkout [supports this browser](index.html#browser-support-webviews).
 * @deprecated Previously, this method checked for Popup support in the browser. The PayPal JS SDK now falls back to a modal if popups are not supported.
 * @returns {Boolean} Returns true if PayPal Checkout supports this browser.
 */
function isSupported() {
  return true;
}

module.exports = {
  create: wrapPromise(create),
  isSupported: isSupported,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
