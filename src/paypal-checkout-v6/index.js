// @ts-nocheck
/**
 * @module braintree-web/paypal-checkout-v6
 * @description A component to integrate with the PayPal Web SDK v6.
 */

import basicComponentVerification from "../lib/basic-component-verification";
import PayPalCheckoutV6 from "./paypal-checkout-v6";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @description Creates a PayPal Checkout V6 component instance. See the {@link PayPalCheckoutV6} class for usage examples.
 *
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A clientToken. Can be used in place of `options.client`. Note: V6 requires client tokens; tokenization keys are not supported.
 * @param {string} [options.merchantAccountId] A non-default merchant account ID to use for tokenization.
 * @example
 * braintree.client.create({
 *   authorization: 'CLIENT_TOKEN_FROM_SERVER'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckoutV6.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutV6Instance) {
 *   // Load the PayPal V6 SDK
 *   return paypalCheckoutV6Instance.loadPayPalSDK();
 * }).then(function (paypalCheckoutV6Instance) {
 *   // Create payment session
 *   var session = paypalCheckoutV6Instance.createOneTimePaymentSession({
 *     amount: '10.00',
 *     currency: 'USD',
 *     onApprove: function (data) {
 *       return paypalCheckoutV6Instance.tokenizePayment(data);
 *     }
 *   });
 *
 *   // Start payment on button click
 *   document.querySelector('#paypal-button').addEventListener('click', function () {
 *     session.start();
 *   });
 * }).catch(function (err) {
 *   console.error('Error!', err);
 * });
 * @returns {Promise} Returns a promise that resolves with the PPCP v6 instance.
 */
function create(options) {
  var name = "PayPal Checkout V6";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var instance = new PayPalCheckoutV6(options);

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
