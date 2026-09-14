// @ts-nocheck
/**
 * @module braintree-web/paypal-checkout
 * @description A component to integrate with the [PayPal JS SDK](https://github.com/paypal/paypal-checkout-components).
 */

import basicComponentVerification from "../lib/basic-component-verification";
import PayPalCheckout from "./paypal-checkout";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @description There are two ways to integrate the PayPal Checkout component. See the [PayPal Checkout constructor documentation](PayPalCheckout.html#PayPalCheckout) for more information and examples.
 *
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.merchantAccountId] A non-default merchant account ID to use for tokenization.
 * @param {boolean} [options.autoSetDataUserIdToken=true] Whether or not to render the PayPal SDK button with a customer's vaulted PayPal account. Enabled by default; pass `autoSetDataUserIdToken: false` to disable. Must be used in conjunction with a Client Token generated with a customer id — has no effect otherwise. Only the literal boolean `false` disables this option; falsy values like `0`, `''`, or the string `'false'` will not.
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
 * @returns {Promise} Returns a Promise that resolves with the PaypalCheckout instance.
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

export default {
  create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION,
};
